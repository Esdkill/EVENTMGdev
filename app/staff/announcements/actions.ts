"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readAttachment } from "../../../lib/attachments";
import { db } from "../../../lib/db";
import { versionField } from "../../../lib/request-fields";
import { RequestError } from "../../../lib/requests";
import { getRequestViewer } from "../../../lib/viewer";

const announcementFields = z.object({
  id: z.uuid(),
  version: z.union([z.literal("").transform(() => null), versionField]),
  intent: z.enum(["save", "publish"]),
  title: z.string().trim().min(1).max(120),
  text: z.string().trim().max(3000),
  role: z.enum(["everyone", "all", "staff"]),
  cohort: z.enum(["demo", "live"]),
  segment: z.enum(["all", "faculty", "year", "group"]).default("all"),
  target: z.string().max(100),
  publishAt: z.union([z.literal(""), z.string().regex(/^20\d\d-\d\d-\d\dT\d\d:\d\d$/)]),
});

function refreshAnnouncements() {
  for (const path of ["/staff/announcements", "/notifications", "/news", "/cabinet"]) revalidatePath(path);
}

export async function publishAnnouncement(_state: { error: string }, form: FormData) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") return { error: "Действие недоступно." };
  const fields = announcementFields.safeParse(Object.fromEntries(form));
  if (!fields.success) return { error: "Проверьте заголовок, текст, аудиторию и дату." };
  const { id, version, intent, title, text, role, cohort, segment, target, publishAt } = fields.data;
  const scoped = role === "all" && segment !== "all";
  const audience = scoped ? segment : role;
  const time = publishAt ? new Date(publishAt + ":00+03:00") : new Date();
  if (Number.isNaN(time.getTime()) || (publishAt && new Date(time.getTime() + 10800000).toISOString().slice(0,16) !== publishAt)) {
    return { error: "Укажите корректную дату." };
  }
  if (intent === "publish" && !text) return { error: "Добавьте текст объявления." };

  if (scoped && (intent === "publish" || target)) {
    if (audience === "year" && !/^[1-6]$/.test(target)) return { error: "Выберите курс." };
    const exists = await db.studentProfile.findFirst({
      where: audience === "group" ? { group: target } : audience === "faculty" ? { faculty: target } : { year: Number(target) },
      select: { userId: true },
    });
    if (!exists) return { error: "Выберите аудиторию из списка." };
  }
  const values = {
    title, text, audience, cohort, target: scoped ? target || null : null,
    important: form.get("important") === "on",
  };
  let attachment: Awaited<ReturnType<typeof readAttachment>>;

  try {
    attachment = await readAttachment(form.get("attachment"));
    if (version === null) {
      await db.bulletin.create({
        data: { id, ...values, publishAt: time, kind: "news",
          publication: intent === "publish" ? "published" : "draft",
          attachment: attachment ? { create: attachment } : undefined },
      });
    } else {
      const updated = await db.$transaction(async tx => {
        const current = await tx.bulletin.findFirst({ where: { id, kind: "news", version }, select: { publication: true, publishAt: true } });
        if (!current) return false;
        const changed = await tx.bulletin.updateMany({
          where: { id, kind: "news", version },
          data: { ...values, version: { increment: 1 },
            publication: intent === "publish" ? "published" : current.publication,
            publishAt: publishAt || (intent === "publish" && current.publication !== "published") ? time : current.publishAt },
        });
        if (!changed.count) return false;
        if (attachment) await tx.bulletinAttachment.upsert({
          where: { bulletinId: id },
          create: { bulletinId: id, ...attachment },
          update: attachment,
        });
        return true;
      });
      if (!updated) return { error: "Объявление изменилось. Откройте его заново, чтобы обновить данные." };
    }
  } catch (error) {
    if (error instanceof RequestError) return { error: error.message };
    if (version !== null || typeof error !== "object" || !error || !("code" in error) || error.code !== "P2002") throw error;
    const saved = await db.bulletin.findUnique({ where: { id }, include: { attachment: true } });
    const sameAttachment = attachment ? saved?.attachment?.name === attachment.name &&
      saved.attachment.mime === attachment.mime && Buffer.from(saved.attachment.content).equals(attachment.content) : !saved?.attachment;
    if (!saved || saved.kind !== "news" || saved.title !== title || saved.text !== text || saved.audience !== audience ||
        saved.cohort !== cohort || saved.target !== values.target || saved.important !== values.important ||
        saved.publication !== (intent === "publish" ? "published" : "draft") ||
        (publishAt && saved.publishAt.getTime() !== time.getTime()) || !sameAttachment) {
      return { error: "Эта отправка уже использована. Откройте новую форму." };
    }
  }
  refreshAnnouncements();
  redirect("/staff/announcements?published=1");
}

export async function hideAnnouncement(id: string, version: number) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff" || !z.uuid().safeParse(id).success || !versionField.safeParse(version).success) return;
  const result = await db.bulletin.updateMany({
    where: { id, version, kind: "news", publication: "published" },
    data: { publication: "hidden", version: { increment: 1 } },
  });
  refreshAnnouncements();
  redirect(`/staff/announcements?${result.count ? "hidden=1" : "stale=1"}`);
}
