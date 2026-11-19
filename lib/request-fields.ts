import { z } from "zod";

export const requestTypes = {
  enrollment: "Справка об обучении",
  military: "Справка в военкомат",
  financial_aid: "Заявление на материальную помощь",
  academic_record: "Академическая справка",
} as const;

export const deliveries = {
  electronic: "Электронно",
  pickup: "В деканате",
} as const;

export const statusLabels = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  READY: "Готова",
  ISSUED: "Выдана",
  REJECTED: "Отклонена",
  CANCELLED: "Отменена",
} as const;

export const requestType = z.enum(["enrollment", "military", "financial_aid", "academic_record"]);
export const requestStatus = z.enum(["NEW", "IN_PROGRESS", "READY", "ISSUED", "REJECTED", "CANCELLED"]);

export const requestFields = z.object({
  type: requestType,
  purpose: z.string().trim().min(1, "Укажите цель получения").max(200, "До 200 символов"),
  copies: z.coerce.number().int().min(1).max(3),
  delivery: z.enum(["electronic", "pickup"]),
  comment: z.string().trim().max(1000, "До 1000 символов").default(""),
});

export const versionField = z.union([z.number(), z.string().regex(/^\d+$/)])
  .transform(Number).pipe(z.number().int().min(0).max(2147483646));
export const requestNumber = (number: number) => String(number).padStart(4, "0");
