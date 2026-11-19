import type { Prisma } from "../generated/prisma/client";

const rows = [
  ["anna-economics", "БИ-2-1", "Экономика", "Лекция", "Наталья Фролова", "А-204", "16", "08:50", "10:20", "planned"],
  ["anna-analysis", "БИ-2-1", "Анализ данных", "Лабораторная", "Сергей Лебедев", "Б-312", "16", "10:40", "12:10", "rescheduled"],
  ["anna-processes", "БИ-2-1", "Бизнес-процессы", "Семинар", "Мария Соколова", "В-105", "16", "12:30", "14:00", "cancelled"],
  ["anna-english", "БИ-2-1", "Английский язык", "Семинар", "Елена Миронова", "А-112", "16", "14:20", "15:50", "planned"],
  ["anna-economics-tuesday", "БИ-2-1", "Базы данных", "Лабораторная", "Павел Громов", "Б-308", "17", "10:40", "12:10", "planned"],
  ["anna-math-wednesday", "БИ-2-1", "Высшая математика", "Лекция", "Ольга Зимина", "А-202", "18", "08:50", "10:20", "planned"],
  ["anna-analysis-thursday", "БИ-2-1", "Экономика", "Семинар", "Наталья Фролова", "А-204", "19", "10:40", "12:10", "planned"],
  ["anna-processes-friday", "БИ-2-1", "Бизнес-процессы", "Семинар", "Мария Соколова", "В-105", "20", "08:50", "10:20", "planned"],
  ["maxim-databases", "БИ-3-2", "Базы данных", "Лабораторная", "Артём Громов", "В-214", "16", "10:40", "12:10", "rescheduled"],
  ["maxim-econometrics", "БИ-3-2", "Эконометрика", "Лекция", "Ольга Захарова", "А-306", "16", "12:30", "14:00", "planned"],
  ["maxim-management", "БИ-3-2", "Проектный менеджмент", "Семинар", "Денис Крылов", "Г-102", "17", "14:20", "15:50", "planned"],
] as const;

const timestamp = (day: string, time: string) => new Date(`2026-11-${day}T${time}:00+03:00`);

export async function seedSchedule(tx: Prisma.TransactionClient) {
  for (const [id, group, subject, kind, teacher, room, day, start, end, status] of rows) {
    const values = {
      group, subject, kind, teacher, room, status, cohort: "demo" as const,
      startsAt: timestamp(day, start), endsAt: timestamp(day, end),
      ...(status === "rescheduled" ? {
        previousAt: timestamp(day, "12:30"),
        previousEnd: timestamp(day, "14:00"),
        previousRoom: id === "maxim-databases" ? "В-210" : "Б-208",
      } : {}),
    };
    await tx.lesson.upsert({
      where: { id },
      create: { id, ...values },
      update: {},
    });
    await tx.lesson.updateMany({ where: { id, version: 0 }, data: values });
  }
}
