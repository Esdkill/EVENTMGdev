import { z } from "zod";

export const topics = { study: "Учёба", certificates: "Справки", schedule: "Расписание", profile: "Уточнение учебных данных", other: "Другое" } as const;
export const messageTopic = z.enum(Object.keys(topics) as (keyof typeof topics)[]);
export const messageText = z.string().trim().min(1, "Напишите сообщение.").max(2000, "До 2000 символов.");
export const threadNumber = (number: number) => "М-" + String(number).padStart(4, "0");
export const topicLabel = (topic: string) => topics[topic as keyof typeof topics] ?? "Другое";
