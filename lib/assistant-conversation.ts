export const assistantTones = {
  friendly: {
    label: "Дружелюбный",
    greeting: "Привет! Чем помочь с учёбой или кабинетом?",
    thanks: "Пожалуйста! Если нужно что-то ещё, спрашивайте.",
    smallTalk: "Всё в порядке. Готов помочь с вопросом по вузу.",
    instruction: "Пиши доброжелательно, простым языком. Обращайся на «вы».",
  },
  formal: {
    label: "Официальный",
    greeting: "Здравствуйте. Чем могу помочь?",
    thanks: "Пожалуйста. Если у вас есть ещё вопросы, задайте их.",
    smallTalk: "Готов ответить на ваш вопрос об учёбе или работе кабинета.",
    instruction: "Сохраняй официальный тон. Используй ясные формулировки без шуток и разговорных выражений.",
  },
  playful: {
    label: "С лёгким юмором",
    greeting: "Бип! Чем помочь с учёбой или кабинетом?",
    thanks: "Бип! Рад помочь.",
    smallTalk: "Бип! Всё в порядке. Готов к вопросам по вузу.",
    instruction: "Можно изредка добавить короткое «Бип!» или лёгкую шутку. Сохраняй серьёзный тон в сложных и чувствительных ситуациях.",
  },
} as const;

export const assistantBehaviors = {
  clarify: {
    label: "Уточнять при необходимости",
    instruction: "Если без детали нельзя дать полезный ответ, задай один короткий уточняющий вопрос. Если данных достаточно, отвечай сразу.",
  },
  direct: {
    label: "Сразу по делу",
    instruction: "Отвечай кратко и по существу. При неоднозначности укажи, что можно сделать сейчас по имеющейся информации.",
  },
} as const;

export type AssistantTone = keyof typeof assistantTones;
export type AssistantBehavior = keyof typeof assistantBehaviors;
export const defaultAssistantTone: AssistantTone = "friendly";
export const defaultAssistantBehavior: AssistantBehavior = "clarify";

export const assistantConversationLimit = 30;
export const assistantHistoryReplyLimit = 2000;
