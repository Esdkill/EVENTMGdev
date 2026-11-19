"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../../../lib/db";
import { groupCode } from "../../../lib/study-groups";
import { getRequestViewer } from "../../../lib/viewer";
import { lessonDay, lessonTime, scheduleDate } from "../../../lib/schedule";
import { lessonKinds } from "./lesson-fields";

const values = z.object({
  id: z.string().min(1).max(100),
  version: z.coerce.number().int().min(0).max(2147483646),
  kind: z.enum(["rescheduled", "cancelled"]),
  reason: z.string().trim().min(1).max(500),
});

const newLesson = z.object({
  group: groupCode,
  cohort: z.enum(["demo", "live"], { error: "Выберите аудиторию расписания." }),
  subject: z.string().trim().min(1, "Укажите дисциплину.").max(120, "Название дисциплины слишком длинное."),
  kind: z.enum(lessonKinds, { error: "Выберите тип занятия." }),
  teacher: z.string().trim().min(1, "Укажите преподавателя.").max(120, "Имя преподавателя слишком длинное."),
  room: z.string().trim().min(1, "Укажите аудиторию.").max(50, "Название аудитории слишком длинное."),
  day: z.string().regex(/^20\d\d-\d\d-\d\d$/, "Укажите дату."),
  start: z.string().regex(/^\d\d:\d\d$/, "Укажите время начала."),
  end: z.string().regex(/^\d\d:\d\d$/, "Укажите время окончания."),
});

function parseMoscowTime(value: string) {
  const date = new Date(value + ":00+03:00");
  return Number.isFinite(date.valueOf()) && `${lessonDay(date)}T${lessonTime(date)}` === value ? date : null;
}

function describeSlot(start: Date, end: Date, room: string) {
  const day = scheduleDate(lessonDay(start), { day: "numeric", month: "long", year: "numeric" });
  return `${day} · ${lessonTime(start)}–${lessonTime(end)} · ауд. ${room}`;
}

export async function createScheduleLesson(_state: { error: string }, form: FormData) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") return { error: "Действие доступно сотруднику деканата." };
  const parsed = newLesson.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { group, cohort, day, start, end, ...details } = parsed.data;
  const startsAt = parseMoscowTime(day + "T" + start);
  const endsAt = parseMoscowTime(day + "T" + end);
  if (!startsAt || !endsAt) return { error: "Проверьте дату и время занятия." };
  if (endsAt <= startsAt) return { error: "Окончание должно быть позже начала." };
  const notify = form.get("notify") === "on";
  const data = { group, cohort, startsAt, endsAt, ...details };
  let lessonId: string;
  try {
    const result = await db.$transaction(async tx => {
      if (!await tx.studyGroup.findUnique({ where: { code: group } })) return { error: "Выберите зарегистрированную группу." };
      const duplicate = await tx.lesson.findFirst({ where: { ...data, status: { not: "cancelled" } }, select: { id: true } });
      if (duplicate) return { error: "Такое занятие уже есть в расписании группы." };

      const lesson = await tx.lesson.create({ data, select: { id: true } });
      if (notify) await tx.bulletin.create({ data: {
        kind: "schedule", audience: "group", cohort, target: group, title: "Новое занятие", publishAt: new Date(),
        text: `${details.subject} · ${details.kind}. ${describeSlot(startsAt, endsAt, details.room)}. Преподаватель — ${details.teacher}.`,
        calendarAt: startsAt, href: `/schedule?date=${day}`,
      } });
      return { id: lesson.id };
    }, { isolationLevel: "Serializable" });
    if (!result.id) return { error: result.error ?? "Не удалось добавить занятие." };
    lessonId = result.id;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2034") {
      return { error: "Расписание обновилось. Проверьте данные и повторите сохранение." };
    }
    throw error;
  }

  revalidatePath("/schedule");
  revalidatePath("/cabinet");
  revalidatePath("/notifications");
  const params = new URLSearchParams({ mode: "add", group, cohort, date: day, saved: notify ? "notified" : "added", lesson: lessonId });
  redirect(`/staff/schedule?${params}`);
}

export async function saveScheduleChange(_state: { error: string }, form: FormData) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") return { error: "Действие недоступно." };
  const parsed = values.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Выберите занятие и укажите причину." };
  const { id, version, kind, reason } = parsed.data;
  const lesson = await db.lesson.findUnique({ where: { id } });
  if (!lesson || lesson.version !== version) return { error: "Занятие изменилось. Обновите страницу." };

  let startsAt = lesson.startsAt;
  let endsAt = lesson.endsAt;
  let room = lesson.room;
  if (kind === "rescheduled") {
    const date = z.string().regex(/^20\d\d-\d\d-\d\dT\d\d:\d\d$/);
    const reschedule = z.object({ start: date, end: date, room: z.string().trim().min(1).max(50) }).safeParse(Object.fromEntries(form));
    if (!reschedule.success) return { error: "Укажите новое время и аудиторию." };
    const start = parseMoscowTime(reschedule.data.start);
    const end = parseMoscowTime(reschedule.data.end);
    if (!start || !end) return { error: "Проверьте дату и время занятия." };
    startsAt = start;
    endsAt = end;
    room = reschedule.data.room;
    if (endsAt <= startsAt) return { error: "Окончание должно быть позже начала." };
    if (lessonDay(startsAt) !== lessonDay(endsAt)) return { error: "Начало и окончание должны быть в один день." };
    if (startsAt.getTime() === lesson.startsAt.getTime() && endsAt.getTime() === lesson.endsAt.getTime() && room === lesson.room && lesson.status !== "cancelled") {
      return { error: "Измените время или аудиторию." };
    }
  }
  if (kind === "cancelled" && lesson.status === "cancelled") return { error: "Занятие уже отменено." };
  const applied = await db.$transaction(async tx => {
    const update = await tx.lesson.updateMany({
      where: { id, version },
      data: {
        status: kind, startsAt, endsAt, room, changeReason: reason, version: { increment: 1 },
        ...(kind === "rescheduled" ? { previousAt: lesson.startsAt, previousEnd: lesson.endsAt, previousRoom: lesson.room } : {}),
      },
    });
    if (!update.count) return false;
    const title = kind === "rescheduled" ? "Изменилось расписание" : "Занятие отменено";
    const before = describeSlot(lesson.startsAt, lesson.endsAt, lesson.room);
    const after = describeSlot(startsAt, endsAt, room);
    await tx.bulletin.create({ data: {
      kind: "schedule", audience: "group", cohort: lesson.cohort, target: lesson.group, title, publishAt: new Date(),
      text: `${lesson.subject}. ${kind === "rescheduled" ? `Было: ${before}. Стало: ${after}.` : `Отмена занятия ${before}.`} ${reason}`,
      calendarAt: kind === "rescheduled" ? startsAt : null, href: `/schedule?date=${lessonDay(startsAt)}`,
    } });
    return true;
  });
  if (!applied) return { error: "Занятие изменилось. Обновите страницу." };
  revalidatePath("/schedule");
  revalidatePath("/cabinet");
  revalidatePath("/notifications");
  redirect(`/staff/schedule?saved=1&group=${encodeURIComponent(lesson.group)}`);
}
