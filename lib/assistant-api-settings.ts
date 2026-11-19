export const defaultAssistantApiUrl = "https://openrouter.ai/api/v1";
const interactivePlan = "Тариф для интерактивных инструментов. Для сайта используйте адрес и ключ API, разрешённые поставщиком для серверных запросов.";

export const assistantProviders = {
  "ant-ling": { label: "Ant Ling", apiUrl: "https://api.ant-ling.com/v1" },
  anthropic: { label: "Anthropic", apiUrl: "https://api.anthropic.com/v1" },
  azure: { label: "Azure OpenAI", apiUrl: "", hint: "Вставьте адрес своего ресурса с окончанием /openai/v1 и ключ этого ресурса." },
  baseten: { label: "Baseten", apiUrl: "https://inference.baseten.co/v1" },
  cerebras: { label: "Cerebras", apiUrl: "https://api.cerebras.ai/v1" },
  "cloudflare-ai-gateway": { label: "Cloudflare AI Gateway", apiUrl: "", hint: "Нужен адрес вашего шлюза с окончанием /compat. Список моделей зависит от того, какие маршруты открывает шлюз." },
  "cloudflare-workers-ai": { label: "Cloudflare Workers AI", apiUrl: "", hint: "Укажите адрес Workers AI для вашего аккаунта с окончанием /ai/v1 и токен Cloudflare." },
  deepseek: { label: "DeepSeek", apiUrl: "https://api.deepseek.com" },
  fireworks: { label: "Fireworks AI", apiUrl: "https://api.fireworks.ai/inference/v1" },
  "github-copilot": { label: "GitHub Copilot", apiUrl: "", hint: "Для прямого доступа нужен вход в GitHub. В этой форме можно указать адрес и ключ совместимого шлюза." },
  google: { label: "Google Gemini", apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  "google-vertex": { label: "Google Vertex AI", apiUrl: "", hint: "Вставьте совместимый адрес вашего проекта и токен доступа Google Cloud." },
  groq: { label: "Groq", apiUrl: "https://api.groq.com/openai/v1" },
  huggingface: { label: "Hugging Face", apiUrl: "https://router.huggingface.co/v1" },
  "kimi-coding": { label: "Kimi Code", apiUrl: "https://api.kimi.ai/coding/v1", hint: "Для Kimi Code нужен ключ из отдельной консоли. Для интеграции сайта Moonshot рекомендует использовать Kimi Platform." },
  meta: { label: "Meta", apiUrl: "https://api.meta.ai/v1" },
  minimax: { label: "MiniMax", apiUrl: "https://api.minimax.io/anthropic/v1" },
  "minimax-cn": { label: "MiniMax (Китай)", apiUrl: "https://api.minimax.cn/anthropic/v1" },
  mistral: { label: "Mistral", apiUrl: "https://api.mistral.ai/v1" },
  moonshotai: { label: "Moonshot AI (Kimi)", apiUrl: "https://api.moonshot.ai/v1" },
  "moonshotai-cn": { label: "Moonshot AI (Китай)", apiUrl: "https://api.moonshot.cn/v1" },
  openai: { label: "OpenAI", apiUrl: "https://api.openai.com/v1" },
  "openai-codex": { label: "OpenAI Codex", apiUrl: "", hint: "Для Codex через подписку нужен вход в аккаунт. В этой форме можно указать адрес и ключ совместимого шлюза." },
  opencode: { label: "OpenCode Zen", apiUrl: "https://opencode.ai/inference/openai/v1" },
  "opencode-go": { label: "OpenCode Go", apiUrl: "https://opencode.ai/inference/go/openai/v1" },
  openrouter: { label: "OpenRouter", apiUrl: defaultAssistantApiUrl },
  "qwen-token-plan": { label: "Qwen Token Plan", apiUrl: "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1", hint: interactivePlan },
  "qwen-token-plan-cn": { label: "Qwen Token Plan (Китай)", apiUrl: "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1", hint: interactivePlan },
  "qwen-token-plan-individual": { label: "Qwen Token Plan Individual", apiUrl: "", hint: interactivePlan },
  radius: { label: "Radius", apiUrl: "", hint: "Укажите выданный вашим шлюзом совместимый адрес API и ключ." },
  together: { label: "Together AI", apiUrl: "https://api.together.xyz/v1" },
  "vercel-ai-gateway": { label: "Vercel AI Gateway", apiUrl: "https://ai-gateway.vercel.sh/v1" },
  xai: { label: "xAI", apiUrl: "https://api.x.ai/v1" },
  xiaomi: { label: "Xiaomi MiMo", apiUrl: "https://api.xiaomimimo.com/v1" },
  "xiaomi-token-plan-ams": { label: "Xiaomi Token Plan (Европа)", apiUrl: "https://token-plan-ams.xiaomimimo.com/v1" },
  "xiaomi-token-plan-cn": { label: "Xiaomi Token Plan (Китай)", apiUrl: "https://token-plan-cn.xiaomimimo.com/v1" },
  "xiaomi-token-plan-sgp": { label: "Xiaomi Token Plan (Сингапур)", apiUrl: "https://token-plan-sgp.xiaomimimo.com/v1" },
  zai: { label: "Z.ai", apiUrl: "https://api.z.ai/api/paas/v4" },
  "zai-coding-cn": { label: "Z.ai Coding Plan (Китай)", apiUrl: "https://open.bigmodel.cn/api/coding/paas/v4" },
  custom: { label: "Другой поставщик", apiUrl: "" },
} as const satisfies Record<string, { label: string; apiUrl: string; hint?: string }>;

export type AssistantProvider = keyof typeof assistantProviders;
export type AssistantApiProtocol = "compatible" | "messages";
export type AssistantApiSettings = { apiUrl: string; protocol: AssistantApiProtocol };

export function getAssistantProvider(provider: string | null | undefined, apiUrl: string): AssistantProvider {
  if (provider === "kimi") return "moonshotai";
  if (provider === "gemini") return "google";
  if (provider && Object.hasOwn(assistantProviders, provider)) return provider as AssistantProvider;
  return (Object.keys(assistantProviders) as AssistantProvider[]).find(id => apiUrl && assistantProviders[id].apiUrl === apiUrl) ?? "custom";
}

export function assistantApiAddress(value: string) {
  const address = value.trim().replace(/\/+$/, "");
  if (address === "https://openrouter.ai") return defaultAssistantApiUrl;
  return address;
}
