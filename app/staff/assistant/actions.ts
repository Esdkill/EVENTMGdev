"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AssistantBehavior, AssistantTone } from "../../../generated/prisma/enums";
import { assistantSettingsId, encryptAssistantKey, getAssistantConnection, removeAssistantConnectionAt } from "../../../lib/assistant-connection";
import { assistantProviders, type AssistantProvider } from "../../../lib/assistant-api-settings";
import { listAssistantModels, normalizeAssistantApiUrl, withAssistantProtocol } from "../../../lib/assistant-api";
import { db } from "../../../lib/db";
import { KnowledgeDocumentError, readKnowledgeDocument } from "../../../lib/assistant-knowledge";
import { requestDraftFromModel } from "../../../lib/request-draft";
import { getRequestViewer } from "../../../lib/viewer";

type State = { error: string; message?: string };

const keyField = z.string().trim().max(4096).regex(/^[!-~]*$/);
const apiFields = z.object({
  apiUrl: z.string().trim().max(500).transform(normalizeAssistantApiUrl)
    .refine((value): value is string => value !== null),
  key: keyField,
});
const modelField = z.string().trim().max(240).regex(/^[@a-z0-9_.:/-]+$/i);
const connectionFields = apiFields.extend({
  provider: z.custom<AssistantProvider>(value => typeof value === "string" && Object.hasOwn(assistantProviders, value)),
  model: modelField,
});

export async function saveAssistantConnection(_state: State, form: FormData): Promise<State> {
  if ((await getRequestViewer())?.role !== "staff") return { error: "Настройки доступны сотруднику деканата." };
  const values = connectionFields.safeParse({
    apiUrl: form.get("apiUrl"), model: form.get("model"), provider: form.get("provider"),
    key: form.get("key") ?? "",
  });
  if (!values.success) return { error: "Проверьте HTTPS-адрес API, идентификатор модели и ключ." };
  const { apiUrl, model, key, provider } = values.data;
  const intent = form.get("intent");
  try {
    const saved = key ? null : await getAssistantConnection();
    const apiKey = key || (saved?.apiUrl === apiUrl ? saved.apiKey : undefined);
    if (!apiKey) return { error: "Введите ключ для выбранного адреса API." };
    const { result, protocol } = await withAssistantProtocol(apiUrl, apiKey, saved?.protocol, async settings => {
      const models = await listAssistantModels(settings);
      if (!models.some(item => item.id === model)) return null;
      return requestDraftFromModel("Нужна справка об обучении для работы, один экземпляр, электронно.", settings, model);
    });
    if (!result) return { error: "Поставщик не вернул эту модель в списке. Обновите список моделей." };
    if (!result.supported || result.type !== "enrollment") {
      return { error: "Модель не вернула корректный черновик. Выберите другую модель." };
    }
    if (intent === "check") return { error: "", message: "Подключение работает. Модель подготовила проверочный черновик." };
    if (key) {
      const data = { model, apiUrl, protocol, provider, encryptedKey: encryptAssistantKey(key) };
      await db.assistantSettings.upsert({
        where: { id: assistantSettingsId },
        create: { id: assistantSettingsId, ...data },
        update: data,
      });
    } else {
      const updated = await db.assistantSettings.updateMany({
        where: { id: assistantSettingsId, apiUrl, protocol, updatedAt: saved?.updatedAt, encryptedKey: { not: null } },
        data: { model, provider },
      });
      if (!updated.count) return { error: "Подключение изменилось. Обновите страницу." };
    }
  } catch {
    return { error: "Не удалось подключиться. Проверьте адрес API, ключ и выбранную модель." };
  }
  revalidatePath("/staff/assistant");
  redirect("/staff/assistant?updated=connection");
}

export async function removeAssistantConnection(_state: State, form: FormData): Promise<State> {
  if ((await getRequestViewer())?.role !== "staff") return { error: "Настройки доступны сотруднику деканата." };
  const revision = z.iso.datetime({ precision: 3 }).safeParse(form.get("revision"));
  if (!revision.success) return { error: "Обновите страницу, чтобы удалить подключение." };
  try {
    const result = await removeAssistantConnectionAt(new Date(revision.data));
    if (!result.count) return { error: "Подключение изменилось. Обновите страницу." };
  } catch {
    return { error: "Не удалось удалить подключение. Попробуйте ещё раз." };
  }
  revalidatePath("/staff/assistant");
  redirect("/staff/assistant?updated=disconnected");
}

export async function loadAssistantModels(apiUrl: string, enteredKey: string) {
  if ((await getRequestViewer())?.role !== "staff") return { error: "Настройки доступны сотруднику деканата." };
  const parsed = apiFields.safeParse({ apiUrl, key: enteredKey });
  if (!parsed.success) return { error: "Проверьте HTTPS-адрес API и ключ." };
  const { apiUrl: base, key } = parsed.data;
  try {
    const saved = key ? null : await getAssistantConnection();
    const apiKey = key || (saved?.apiUrl === base ? saved.apiKey : undefined);
    if (!apiKey) return { error: "Введите ключ для выбранного адреса API." };
    const { result: models } = await withAssistantProtocol(base, apiKey, saved?.protocol, listAssistantModels);
    return { models };
  } catch {
    return { error: "Не удалось загрузить модели. Проверьте адрес и ключ API." };
  }
}

export async function revealAssistantKey() {
  if ((await getRequestViewer())?.role !== "staff") return { error: "Настройки доступны сотруднику деканата." };
  try {
    const { apiKey } = await getAssistantConnection();
    return apiKey ? { key: apiKey } : { error: "Ключ API ещё не сохранён." };
  } catch {
    return { error: "Не удалось прочитать сохранённый ключ." };
  }
}

const conversationFields = z.object({
  tone: z.enum(AssistantTone),
  behavior: z.enum(AssistantBehavior),
});

export async function saveAssistantConversation(_state: State, form: FormData): Promise<State> {
  if ((await getRequestViewer())?.role !== "staff") return { error: "Настройки доступны сотруднику деканата." };
  const values = conversationFields.safeParse({ tone: form.get("tone"), behavior: form.get("behavior") });
  if (!values.success) return { error: "Выберите тон и стиль ответа из списка." };
  try {
    await db.assistantSettings.upsert({
      where: { id: assistantSettingsId },
      create: { id: assistantSettingsId, model: "", apiUrl: "", ...values.data },
      update: values.data,
    });
  } catch {
    return { error: "Не удалось сохранить стиль ответов. Попробуйте ещё раз." };
  }
  revalidatePath("/staff/assistant");
  redirect("/staff/assistant?updated=conversation");
}

export async function addKnowledgeDocument(_state: State, form: FormData): Promise<State> {
  if ((await getRequestViewer())?.role !== "staff") return { error: "База знаний доступна сотруднику деканата." };
  const file = form.get("document");
  if (!(file instanceof File)) return { error: "Выберите документ." };
  try {
    const id = randomUUID();
    const { sources, ...document } = await readKnowledgeDocument(file, `/api/v1/assistant/documents/${id}`);
    const checksum = createHash("sha256").update(document.content).digest("hex");
    await db.assistantDocument.upsert({
      where: { checksum },
      create: { id, checksum, ...document, sources: { createMany: { data: sources } } },
      update: {},
    });
  } catch (error) {
    return { error: error instanceof KnowledgeDocumentError ? error.message : "Не удалось добавить документ. Попробуйте ещё раз." };
  }
  revalidatePath("/staff/assistant");
  redirect("/staff/assistant?updated=document");
}

export async function removeKnowledgeItem(form: FormData) {
  if ((await getRequestViewer())?.role !== "staff") return;
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  if (form.get("kind") === "document") {
    await db.assistantDocument.deleteMany({ where: { id: id.data } });
  } else {
    await db.assistantSource.deleteMany({ where: { id: id.data, documentId: null } });
  }
  revalidatePath("/staff/assistant");
}
