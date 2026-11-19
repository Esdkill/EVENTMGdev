import { readFile } from "node:fs/promises";
import type { Prisma, RequestDelivery, RequestStatus } from "../generated/prisma/client";

type DemoRequest = {
  number: number;
  student: "anna" | "maxim";
  delivery: RequestDelivery;
  purpose: string;
  submittedAt: string;
  dueOn: string;
  progress: { status: RequestStatus; at: string; reason?: string }[];
  document?: boolean;
};

const demoRequests: DemoRequest[] = [
  {
    number: 418, student: "anna", delivery: "electronic", purpose: "Для предоставления по месту работы",
    submittedAt: "2026-11-13T09:10:00+03:00", dueOn: "2026-11-18",
    progress: [{ status: "IN_PROGRESS", at: "2026-11-16T09:10:00+03:00" }],
  },
  {
    number: 409, student: "anna", delivery: "pickup", purpose: "Для предоставления в учебную организацию",
    submittedAt: "2026-11-10T10:30:00+03:00", dueOn: "2026-11-13",
    progress: [
      { status: "IN_PROGRESS", at: "2026-11-11T09:00:00+03:00" },
      { status: "READY", at: "2026-11-13T11:20:00+03:00" },
    ],
  },
  {
    number: 412, student: "maxim", delivery: "electronic", purpose: "Для предоставления по месту работы",
    submittedAt: "2026-11-11T11:00:00+03:00", dueOn: "2026-11-16", document: true,
    progress: [
      { status: "IN_PROGRESS", at: "2026-11-12T09:00:00+03:00" },
      { status: "READY", at: "2026-11-14T12:15:00+03:00" },
    ],
  },
  {
    number: 415, student: "maxim", delivery: "pickup", purpose: "Для организации",
    submittedAt: "2026-11-12T13:40:00+03:00", dueOn: "2026-11-17",
    progress: [
      { status: "IN_PROGRESS", at: "2026-11-13T10:00:00+03:00" },
      { status: "REJECTED", at: "2026-11-14T10:30:00+03:00", reason: "Уточните название организации и подайте новую заявку." },
    ],
  },
];

export async function seedDemoActivity(tx: Prisma.TransactionClient) {
  const [anna, maxim, irina] = await Promise.all([
    tx.user.findUniqueOrThrow({ where: { username: "anna", email: "anna@deanery.example", role: "student" }, select: { id: true } }),
    tx.user.findUniqueOrThrow({ where: { username: "maxim", email: "maxim@deanery.example", role: "student" }, select: { id: true } }),
    tx.user.findUniqueOrThrow({ where: { username: "irina", email: "irina@deanery.example", role: "staff" }, select: { id: true } }),
  ]);
  const students = { anna, maxim };

  // Reserve demonstrated numbers while normal inserts are blocked.
  await tx.$executeRaw`LOCK TABLE "DocumentRequest", "DeanThread" IN SHARE ROW EXCLUSIVE MODE`;
  await tx.$queryRaw`SELECT setval('"DocumentRequest_number_seq"', GREATEST(
    (SELECT last_value FROM "DocumentRequest_number_seq"), (SELECT max("number") FROM "DocumentRequest"),
    ${Math.max(...demoRequests.map(request => request.number))}
  ))`;
  await tx.$queryRaw`SELECT setval('"DeanThread_number_seq"', GREATEST(
    (SELECT last_value FROM "DeanThread_number_seq"), (SELECT max("number") FROM "DeanThread"), 172
  ))`;

  for (const demo of demoRequests) {
    const ownerId = students[demo.student].id;
    const submissionKey = `demo-request-${demo.number}`;
    if (await tx.documentRequest.findUnique({ where: { ownerId_submissionKey: { ownerId, submissionKey } }, select: { id: true } })) continue;
    const occupied = await tx.documentRequest.findUnique({ where: { number: demo.number }, select: { id: true } });
    const createdAt = new Date(demo.submittedAt);
    const events: Prisma.RequestEventUncheckedCreateWithoutRequestInput[] = [
      { toStatus: "NEW", actorId: ownerId, createdAt },
    ];
    for (const event of demo.progress) {
      events.push({
        fromStatus: events.at(-1)!.toStatus, toStatus: event.status, reason: event.reason,
        actorId: irina.id, createdAt: new Date(event.at),
      });
    }
    const latest = events.at(-1)!;
    const content = demo.document ? await readFile(new URL("./fixtures/enrollment-sample.pdf", import.meta.url)) : null;
    await tx.documentRequest.create({
      data: {
        number: occupied ? undefined : demo.number, ownerId, submissionKey, type: "enrollment", copies: 1,
        delivery: demo.delivery, purpose: demo.purpose, comment: "", status: latest.toStatus,
        createdAt, dueOn: new Date(demo.dueOn), version: demo.progress.length,
        events: { create: events },
        document: content ? { create: { content, size: content.length, createdAt: latest.createdAt } } : undefined,
      },
    });
  }

  const threadId = "demo-thread-0172";
  const occupied = await tx.deanThread.findUnique({ where: { number: 172 }, select: { id: true } });
  const createdAt = new Date("2026-11-13T14:20:00+03:00");
  const repliedAt = new Date("2026-11-14T11:00:00+03:00");
  await tx.deanThread.upsert({
    where: { id: threadId },
    update: {},
    create: {
      id: threadId, number: occupied ? undefined : 172, topic: "study", ownerId: anna.id,
      createdAt, updatedAt: repliedAt, staffReadAt: repliedAt,
      messages: { create: [
        { id: "demo-message-0172-question", authorId: anna.id, createdAt, text: "Подскажите, как согласовать тему курсовой работы?" },
        {
          id: "demo-message-0172-reply", authorId: irina.id, createdAt: repliedAt,
          text: "Анна, согласуйте тему с преподавателем и пришлите её в это обращение. При необходимости можно подойти в кабинет А-101.",
        },
      ] },
    },
  });

  const bulletinId = "demo-deadline-anna";
  if (await tx.bulletin.findUnique({ where: { id: bulletinId, audience: "student", target: anna.id }, select: { id: true } })) {
    await tx.bulletinAttachment.upsert({
      where: { bulletinId }, update: {},
      create: {
        bulletinId, name: "Памятка по курсовой работе.pdf", mime: "application/pdf",
        content: await readFile(new URL("./fixtures/coursework-guide.pdf", import.meta.url)),
      },
    });
  }
}
