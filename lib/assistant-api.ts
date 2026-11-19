import { lookup } from "node:dns";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent } from "undici";
import { z } from "zod";
import { assistantApiAddress, type AssistantApiProtocol, type AssistantApiSettings } from "./assistant-api-settings";

export type AssistantCredentials = AssistantApiSettings & { apiKey: string };
export type AssistantModel = { id: string; name: string };

const trustedHosts = new Set(["openrouter.ai", "api.openai.com", "api.anthropic.com", "generativelanguage.googleapis.com"]);
const publicTransport = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      lookup(hostname, { all: true, family: options.family }, (error, addresses) => {
        if (error) return callback(error, "");
        const publicAddresses = addresses.filter(({ address }) => ipaddr.process(address).range() === "unicast");
        if (!publicAddresses.length || publicAddresses.length !== addresses.length) {
          return callback(new Error("Assistant API hostname is not public"), "");
        }
        if (options.all) return callback(null, publicAddresses);
        callback(null, publicAddresses[0].address, publicAddresses[0].family);
      });
    },
  },
});

export function normalizeAssistantApiUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password || url.search || url.hash ||
        !url.hostname.includes(".") || url.hostname.endsWith(".") || isIP(url.hostname)) return null;
    return assistantApiAddress(url.href);
  } catch {
    return null;
  }
}

export async function withAssistantProtocol<T>(
  apiUrl: string,
  apiKey: string,
  savedProtocol: AssistantApiProtocol | undefined,
  run: (settings: AssistantCredentials) => Promise<T>,
): Promise<{ protocol: AssistantApiProtocol; result: T }> {
  const url = new URL(apiUrl);
  const host = url.hostname;
  const protocol = savedProtocol ?? (host === "api.anthropic.com" || url.pathname.endsWith("/anthropic/v1") ? "messages" : "compatible");
  try {
    return { protocol, result: await run({ apiUrl, apiKey, protocol }) };
  } catch (error) {
    if (savedProtocol || trustedHosts.has(host)) throw error;
    const alternative = protocol === "compatible" ? "messages" : "compatible";
    return { protocol: alternative, result: await run({ apiUrl, apiKey, protocol: alternative }) };
  }
}

async function assistantFetch(settings: AssistantCredentials, path: string, body?: object, timeout = 14_000) {
  const base = normalizeAssistantApiUrl(settings.apiUrl);
  if (!base) throw new Error("Invalid assistant API URL");
  const host = new URL(base).hostname;
  const azure = host.endsWith(".openai.azure.com") || host.endsWith(".services.ai.azure.com") || host.endsWith(".cognitiveservices.azure.com");
  const options: RequestInit & { dispatcher?: Agent } = {
    method: body ? "POST" : "GET",
    signal: AbortSignal.timeout(timeout),
    cache: "no-store",
    redirect: "error",
    headers: {
      ...(settings.protocol === "messages"
        ? { "x-api-key": settings.apiKey, "anthropic-version": "2023-06-01" }
        : azure ? { "api-key": settings.apiKey } : { Authorization: `Bearer ${settings.apiKey}` }),
      ...(body ? { "Content-Type": "application/json" } : {}),
    } as Record<string, string>,
    body: body ? JSON.stringify(body) : undefined,
  };
  if (!trustedHosts.has(host)) options.dispatcher = publicTransport;
  return fetch(base + path, options);
}

const modelCatalog = z.object({
  data: z.array(z.looseObject({ id: z.string(), name: z.string().nullish(), display_name: z.string().nullish() })),
  has_more: z.boolean().optional(),
  last_id: z.string().nullish(),
});

const workersModelCatalog = z.object({
  success: z.literal(true),
  result: z.array(z.object({ name: z.string() })),
  result_info: z.object({ total_pages: z.number().optional() }).optional(),
});

async function listWorkersModels(settings: AssistantCredentials) {
  const models = new Map<string, AssistantModel>();
  const account = { ...settings, apiUrl: settings.apiUrl.replace(/\/v1$/, "") };
  for (let page = 1; page <= 10; page += 1) {
    const response = await assistantFetch(account, `/models/search?task=Text%20Generation&per_page=100&page=${page}`, undefined, 8000);
    if (!response.ok) throw new Error("Workers AI model catalog unavailable");
    const catalog = workersModelCatalog.parse(await response.json());
    for (const { name } of catalog.result) models.set(name, { name, id: name });
    if (catalog.result_info?.total_pages !== undefined ? page >= catalog.result_info.total_pages : catalog.result.length < 100) break;
  }
  return [...models.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function listAssistantModels(settings: AssistantCredentials): Promise<AssistantModel[]> {
  const url = new URL(settings.apiUrl);
  if (settings.protocol === "compatible" && url.hostname === "api.cloudflare.com" &&
      /^\/client\/v4\/accounts\/[a-f0-9]+\/ai\/v1$/.test(url.pathname)) return listWorkersModels(settings);
  const openRouter = url.hostname === "openrouter.ai";
  const path = openRouter && settings.protocol === "compatible" ? "/models/user" : "/models";
  const models = new Map<string, AssistantModel>();
  let cursor = "";
  let page = 0;
  do {
    page += 1;
    const response = await assistantFetch(settings, path + (cursor ? "?after_id=" + encodeURIComponent(cursor) : ""), undefined, 8000);
    if (!response.ok) throw new Error("Assistant model catalog unavailable");
    const result = modelCatalog.parse(await response.json());
    for (const item of result.data) {
      if (item.available === false || item.is_available === false || item.enabled === false) continue;
      models.set(item.id, { id: item.id, name: item.display_name ?? item.name ?? item.id });
    }
    const next = settings.protocol === "messages" && result.has_more ? result.last_id : null;
    cursor = next && next !== cursor ? next : "";
  } while (cursor && page < 10 && models.size < 1000);
  return [...models.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const completion = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string() }) })).nonempty() });
const message = z.object({ content: z.array(z.object({ type: z.string(), text: z.string().optional() })) });

const localConstraints = new Set(["minLength", "maxLength", "minimum", "maximum", "pattern"]);
function portableSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(portableSchema);
  if (!schema || typeof schema !== "object") return schema;
  return Object.fromEntries(Object.entries(schema)
    .filter(([key]) => !localConstraints.has(key))
    .map(([key, value]) => [key, portableSchema(value)]));
}

function parseAssistantJson(content: string) {
  const text = content.trim();
  const fenced = /^```(?:json)?\s*([\s\S]+?)\s*```$/i.exec(text);
  return JSON.parse(fenced?.[1] ?? text) as unknown;
}

type CompletionInput = {
  model: string;
  system: string;
  input: string;
  name: string;
  schema: object;
  maxTokens: number;
  retry?: boolean;
};

export async function completeAssistantJson(settings: AssistantCredentials, input: CompletionInput): Promise<unknown> {
  const { model, system, name, schema, maxTokens } = input;
  const user = { role: "user", content: input.input };
  const jsonInstruction = () => system + "\nВерни только JSON по схеме " + JSON.stringify(schema);

  async function send(path: string, body: object) {
    let response = await assistantFetch(settings, path, body);
    if (input.retry && [502, 503, 504].includes(response.status)) {
      await response.body?.cancel();
      response = await assistantFetch(settings, path, body);
    }
    return response;
  }

  if (settings.protocol === "messages") {
    const body = { model, system, max_tokens: maxTokens, messages: [user] };
    let response = await send("/messages", {
      ...body, output_config: { format: { type: "json_schema", schema: portableSchema(schema) } },
    });
    if (response.status === 400 || response.status === 422) {
      await response.body?.cancel();
      response = await send("/messages", { ...body, system: jsonInstruction() });
    }
    if (!response.ok) throw new Error("Assistant messages unavailable");
    const text = message.parse(await response.json()).content.find(block => block.type === "text")?.text;
    if (!text) throw new Error("Missing assistant response");
    return parseAssistantJson(text);
  }

  const hostname = new URL(settings.apiUrl).hostname;
  const openRouter = hostname === "openrouter.ai";
  const body = {
    model,
    ...(hostname === "api.openai.com" ? { max_completion_tokens: Math.max(maxTokens, 1000) } : { max_tokens: maxTokens }),
    messages: [{ role: "system", content: system }, user],
    ...(openRouter ? { provider: { require_parameters: true } } : {}),
  };
  let response = await send("/chat/completions", {
    ...body,
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema: portableSchema(schema) } },
  });
  if (response.status === 400 || response.status === 422) {
    const plain = { ...body, messages: [{ role: "system", content: jsonInstruction() }, user] };
    await response.body?.cancel();
    response = await send("/chat/completions", { ...plain, response_format: { type: "json_object" } });
    if (response.status === 400 || response.status === 422) {
      await response.body?.cancel();
      response = await send("/chat/completions", plain);
    }
  }
  if (!response.ok) throw new Error("Assistant completion unavailable");
  return parseAssistantJson(completion.parse(await response.json()).choices[0].message.content);
}
