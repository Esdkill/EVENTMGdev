"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../lib/db";
import { readAttachment } from "../../lib/attachments";
import { messageText, messageTopic } from "../../lib/messages";
import { RequestError } from "../../lib/requests";
import { getRequestViewer } from "../../lib/viewer";

export async function sendMessage(threadId: string | null, _state: { error: string }, form: FormData) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "student" && viewer.role !== "staff") return { error: "Действие недоступно." };
  if (!threadId && viewer.role !== "student") return { error: "Создать обращение может студент." };

  let id: string;
  try {
    const key = z.uuid().parse(form.get("key"));
    const topic = threadId ? null : messageTopic.parse(form.get("topic"));
    const text = messageText.parse(form.get("text"));
    const attachment = await readAttachment(form.get("attachment"));
    const messageId = createHash("sha256").update(viewer.id + ":" + key).digest("hex");
    id = await db.$transaction(async tx => {
      // Lock this submission key so a retry cannot append the same message twice.
      await tx.$queryRaw`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtext(${messageId}))`;
      const previous = await tx.deanMessage.findUnique({ where: { id: messageId }, include: { thread: true } });
      if (previous) {
        if (previous.text !== text || (threadId ? previous.threadId !== threadId : previous.thread.topic !== topic)) {
          throw new RequestError(409, "Отправка уже выполнена. Обновите страницу.");
        }
        return previous.threadId;
      }
      const now = new Date();
      const data = { id: messageId, authorId: viewer.id, text, ...(attachment ? { attachment: { create: attachment } } : {}) };
      if (!threadId) {
        const thread = await tx.deanThread.create({
          data: { ownerId: viewer.id, topic: topic!, messages: { create: data } },
          select: { id: true },
        });
        return thread.id;
      }
      const matched = await tx.deanThread.updateMany({
        where: { id: threadId, ...(viewer.role === "student" ? { ownerId: viewer.id } : {}) },
        data: { updatedAt: now, ...(viewer.role === "staff" ? { staffReadAt: now } : {}) },
      });
      if (!matched.count) throw new RequestError(404, "Обращение недоступно.");
      await tx.deanMessage.create({ data: { ...data, threadId, createdAt: now } });
      return threadId;
    });
  } catch (error) {
    if (error instanceof RequestError) return { error: error.message };
    if (error instanceof z.ZodError) return { error: error.issues[0]?.message ?? "Проверьте поля." };
    throw error;
  }
  revalidatePath("/messages");
  revalidatePath(`/messages/${id}`);
  redirect(`/messages/${id}`);
}

export async function markThreadRead(id: string) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") return;
  const thread = await db.deanThread.findUnique({ where: { id }, select: { updatedAt: true } });
  if (thread) await db.deanThread.updateMany({ where: { id, updatedAt: thread.updatedAt }, data: { staffReadAt: new Date(), updatedAt: thread.updatedAt } });
  revalidatePath("/messages");
  revalidatePath(`/messages/${id}`);
}
