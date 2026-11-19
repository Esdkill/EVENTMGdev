import { createHash } from "node:crypto";
import { cache } from "react";
import { db } from "./db";
import { lessonDay, scheduleDate, scheduleDay, scheduleNow, shiftDay } from "./schedule";

export const deadlineReminderPrefix = "grade-deadline-";

export const syncDeadlineReminders = cache(async (userId: string, demo: boolean) => {
  const today = scheduleDay(undefined, scheduleNow(demo));
  const lastDay = shiftDay(today, 3);
  const cohort: "demo" | "live" = demo ? "demo" : "live";

  await db.$transaction(async transaction => {
    const grades = await transaction.gradeRecord.findMany({
      where: {
        ownerId: userId,
        status: { in: ["planned", "retake"] },
        nextAt: { gte: new Date(today + "T00:00:00+03:00"), lt: new Date(shiftDay(lastDay, 1) + "T00:00:00+03:00") },
      },
      select: { id: true, subject: true, nextAt: true, status: true, kind: true },
    });
    const reminders = grades.flatMap(grade => {
      if (!grade.nextAt) return [];
      const day = lessonDay(grade.nextAt);
      const date = scheduleDate(day, { day: "numeric", month: "long" });
      const event = grade.status === "retake" ? "Пересдача" : grade.kind;
      const remindOn = new Date(shiftDay(day, -3) + "T00:00:00+03:00");
      const key = createHash("sha256").update(JSON.stringify([grade.id, grade.nextAt, grade.status])).digest("hex");
      return [{
        id: deadlineReminderPrefix + key,
        kind: "deadline" as const,
        audience: "student" as const,
        target: userId,
        cohort,
        title: `${event} · ${grade.subject}`,
        text: `${date} — ${event.toLowerCase()} по дисциплине «${grade.subject}». Подробности в разделе «Оценки и сессия».`,
        calendarAt: grade.nextAt,
        publishAt: demo && remindOn > new Date() ? new Date() : remindOn,
        important: true,
        href: `/grades/${encodeURIComponent(grade.id)}`,
      }];
    });
    await transaction.bulletin.deleteMany({
      where: { id: { startsWith: deadlineReminderPrefix, notIn: reminders.map(item => item.id) }, kind: "deadline", audience: "student", target: userId },
    });
    if (reminders.length) await transaction.bulletin.createMany({ data: reminders, skipDuplicates: true });
  });
});
