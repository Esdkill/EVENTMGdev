import type { RequestStatus } from "../generated/prisma/client";
import { db } from "./db";
import { requestFields, requestNumber, statusLabels, versionField } from "./request-fields";
import { z } from "zod";

export const pdfLimit = 10 * 1024 * 1024;
export class RequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const submissionKey = z.string().uuid();

function dueDate(now = new Date()) {
  const date = new Date(now.getTime() + 3 * 3600_000);
  date.setUTCHours(0, 0, 0, 0);
  for (let days = 0; days < 3;) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) days++;
  }
  return date;
}

export async function submitRequest(ownerId: string, keyInput: unknown, input: unknown) {
  const fields = requestFields.parse(input);
  const key = submissionKey.parse(keyInput);
  try {
    return await db.documentRequest.create({
      data: {
        ...fields, ownerId, submissionKey: key, dueOn: dueDate(),
        events: { create: { actorId: ownerId, toStatus: "NEW" } },
      },
      select: { id: true, number: true, status: true, dueOn: true },
    });
  } catch (error) {
    if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "P2002") throw error;
    const existing = await db.documentRequest.findUnique({ where: { ownerId_submissionKey: { ownerId, submissionKey: key } } });
    if (!existing) throw error;
    if (existing.type !== fields.type || existing.purpose !== fields.purpose || existing.copies !== fields.copies ||
        existing.delivery !== fields.delivery || existing.comment !== fields.comment) {
      throw new RequestError(409, "Эта отправка уже использована. Откройте новую форму.");
    }
    return { id: existing.id, number: existing.number, status: existing.status, dueOn: existing.dueOn };
  }
}

const transitions = {
  start: { from: ["NEW"], to: "IN_PROGRESS" },
  ready: { from: ["IN_PROGRESS"], to: "READY" },
  reject: { from: ["IN_PROGRESS"], to: "REJECTED" },
  issue: { from: ["READY"], to: "ISSUED" },
  cancel: { from: ["NEW", "IN_PROGRESS"], to: "CANCELLED" },
} satisfies Record<string, { from: RequestStatus[]; to: RequestStatus }>;

export const staffAction = z.enum(["start", "ready", "reject", "issue"]);

export async function changeStatus(actor: { id: string; role: string }, id: string, action: keyof typeof transitions,
  versionInput: unknown, reasonInput?: unknown, file?: File) {
  const version = versionField.parse(versionInput);
  if (actor.role !== (action === "cancel" ? "student" : "staff")) throw new RequestError(403, "Действие недоступно");
  const where = { id, ...(action === "cancel" ? { ownerId: actor.id } : {}) };
  const request = await db.documentRequest.findFirst({ where, select: { status: true, version: true, delivery: true, ownerId: true, number: true } });
  if (!request) throw new RequestError(404, "Эта заявка вам недоступна");
  const transition: { from: RequestStatus[]; to: RequestStatus } = transitions[action];
  if (request.version !== version || !transition.from.includes(request.status)) {
    throw new RequestError(409, "Статус заявки изменился. Обновите страницу.");
  }

  const reason = action === "reject"
    ? z.string().trim().min(1, "Укажите причину отказа").max(500, "До 500 символов").parse(reasonInput)
    : undefined;
  let document: { content: Uint8Array<ArrayBuffer>; size: number } | undefined;
  if (action === "ready" && request.delivery === "electronic") {
    if (!file || file.size < 8 || file.size > pdfLimit) {
      throw new RequestError(422, "Добавьте PDF-файл размером до 10 МБ.");
    }
    const content = new Uint8Array(await file.arrayBuffer());
    if (!new TextDecoder().decode(content.subarray(0, 5)).startsWith("%PDF-") ||
        !new TextDecoder().decode(content.subarray(-1024)).includes("%%EOF")) {
      throw new RequestError(422, "Файл должен быть в формате PDF.");
    }
    document = { content, size: file.size };
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.documentRequest.updateMany({
      where: { ...where, version, status: request.status },
      data: { status: transition.to, version: { increment: 1 } },
    });
    if (!updated.count) throw new RequestError(409, "Статус заявки изменился. Обновите страницу.");
    if (document) await tx.requestDocument.create({ data: { requestId: id, ...document } });
    await tx.requestEvent.create({
      data: { requestId: id, actorId: actor.id, fromStatus: request.status, toStatus: transition.to, reason },
    });
    if (action !== "cancel") await tx.bulletin.create({ data: {
      audience: "student", target: request.ownerId, kind: "request", publishAt: new Date(),
      title: `Заявка № ${requestNumber(request.number)} · ${statusLabels[transition.to].toLowerCase()}`,
      text: reason ?? "Подробности доступны в карточке заявки.", href: `/requests/${id}`,
    } });
    return { id, status: transition.to, version: version + 1 };
  });
}

export async function saveStaffNote(id: string, version: number, staffNote: string) {
  const updated = await db.documentRequest.updateMany({
    where: { id, version },
    data: { staffNote, version: { increment: 1 } },
  });
  if (!updated.count) throw new RequestError(409, "Заявка изменилась. Обновите страницу.");
}

export const requestDetails = {
  events: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] },
  document: { select: { id: true, size: true, createdAt: true } },
};

export const requestMessageText = z.string().trim()
  .min(1, "Напишите сообщение студенту.").max(1000, "Сообщение должно содержать до 1000 символов.");

export const requestMessages = {
  orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
  select: { id: true, text: true, createdAt: true, author: { select: { name: true } } },
};

export async function sendRequestMessage(requestId: string, authorId: string, key: unknown, text: unknown) {
  const id = submissionKey.parse(key);
  const message = requestMessageText.parse(text);
  const request = await db.documentRequest.findUnique({ where: { id: requestId }, select: { id: true } });
  if (!request) throw new RequestError(404, "Заявка не найдена.");

  const saved = await db.requestMessage.upsert({
    where: { id },
    create: { id, requestId, authorId, text: message },
    update: {},
    select: { requestId: true, authorId: true, text: true },
  });
  if (saved.requestId !== requestId || saved.authorId !== authorId || saved.text !== message) {
    throw new RequestError(409, "Сообщение уже отправлено. Обновите страницу.");
  }
}
