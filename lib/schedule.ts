import { db } from "./db";
import type { Lesson } from "../generated/prisma/client";

export const demoDay = "2026-11-16";
const dateFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow", dateStyle: "short" });

export function scheduleNow(demo: boolean) {
  return demo ? new Date(demoDay + "T10:25:00+03:00") : new Date();
}

export function scheduleDay(value?: string, now = new Date()) {
  if (value && /^20\d\d-\d\d-\d\d$/.test(value)) {
    const date = new Date(value + "T00:00:00Z");
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value) return value;
  }
  return dateFormat.format(now);
}

export function shiftDay(day: string, amount: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function weekStart(day: string) {
  const weekday = new Date(day + "T12:00:00Z").getUTCDay();
  return shiftDay(day, -((weekday + 6) % 7));
}

export function scheduleRange(group: string, first: string, last: string, demo: boolean) {
  return db.lesson.findMany({
    where: {
      group,
      cohort: demo ? "demo" : "live",
      startsAt: { gte: new Date(first + "T00:00:00+03:00"), lt: new Date(shiftDay(last, 1) + "T00:00:00+03:00") },
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
  });
}

export const lessonDay = (date: Date) => dateFormat.format(date);
export const lessonTime = (date: Date) => new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" }).format(date);

export function nextLessonBreak(lessons: readonly Pick<Lesson, "startsAt" | "endsAt" | "status">[], now: Date) {
  const active = lessons.filter(lesson => lesson.status !== "cancelled").sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  let busyUntil: Date | undefined;
  for (const lesson of active) {
    if (busyUntil && lesson.startsAt.getTime() - Math.max(busyUntil.getTime(), now.getTime()) >= 45 * 60_000) {
      return { start: busyUntil, end: lesson.startsAt, minutes: Math.floor((lesson.startsAt.getTime() - busyUntil.getTime()) / 60_000) };
    }
    if (!busyUntil || lesson.endsAt > busyUntil) busyUntil = lesson.endsAt;
  }
  return null;
}

export function scheduleDate(day: string, format: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("ru-RU", { ...format, timeZone: "UTC" }).format(new Date(day + "T12:00:00Z"));
}

export function previousLessonSlot(lesson: Pick<Lesson, "startsAt" | "previousAt" | "previousEnd" | "previousRoom">) {
  const day = lesson.previousAt ? lessonDay(lesson.previousAt) : null;
  const date = day && day !== lessonDay(lesson.startsAt) ? scheduleDate(day, { day: "numeric", month: "short" }) : null;
  const time = lesson.previousAt
    ? [lessonTime(lesson.previousAt), lesson.previousEnd && lessonTime(lesson.previousEnd)].filter(Boolean).join("–")
    : null;
  return [date, time, lesson.previousRoom].filter(Boolean).join(" · ");
}
