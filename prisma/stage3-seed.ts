import type { Prisma } from "../generated/prisma/client";

const grades = {
  anna: [
    { subject: "Экономика", teacher: "Наталья Фролова", kind: "Экзамен", score: 5, status: "passed", nextAt: "2026-11-25T08:50:00+03:00" },
    { subject: "Английский язык", teacher: "Елена Миронова", kind: "Зачёт", score: null, status: "passed" },
    { subject: "Проектный практикум", teacher: "Кирилл Смирнов", kind: "Курсовая", score: 4, status: "passed" },
    { subject: "Физическая культура", teacher: "Ирина Романова", kind: "Зачёт", score: null, status: "passed" },
    { subject: "Анализ данных", teacher: "Сергей Лебедев", kind: "Экзамен", score: null, status: "planned", nextAt: "2026-12-21T10:40:00+03:00" },
    { subject: "Базы данных", teacher: "Павел Громов", kind: "Экзамен", score: null, status: "planned", nextAt: "2026-12-23T10:40:00+03:00" },
    { subject: "Высшая математика", teacher: "Ольга Зимина", kind: "Экзамен", score: null, status: "planned", nextAt: "2026-12-25T08:50:00+03:00" },
  ],
  maxim: [
    { subject: "Базы данных", teacher: "Алексей Волков", score: 2, status: "retake" },
    { subject: "Эконометрика", teacher: "Ольга Захарова", score: 4, status: "passed" },
    { subject: "Проектный менеджмент", teacher: "Денис Крылов", score: 4, status: "passed" },
  ],
} as const;

export async function seedAcademicData(tx: Prisma.TransactionClient, username: "anna" | "maxim", ownerId: string) {
  const semester = username === "anna" ? 3 : 5;
  for (const [index, record] of grades[username].entries()) {
    const id = `demo-grade-${username}-${index}`;
    const { subject, teacher, score, status } = record;
    const values = { subject, teacher, score, status,
      kind: "kind" in record ? record.kind : "Экзамен",
      attendance: index === 0 && username === "anna" ? 92 : 86,
      nextAt: "nextAt" in record ? new Date(record.nextAt) : index === 0 && username === "maxim" ? new Date("2026-11-23T10:40:00+03:00") : null,
    };
    await tx.gradeRecord.upsert({ where: { id }, create: { id, ownerId, semester, ...values }, update: values });
    if (username === "anna" && index === 0) {
      const checkpoints = [
        { title: "Тесты", points: 28, maxPoints: 30 },
        { title: "Практические работы", points: 27, maxPoints: 30 },
        { title: "Экзамен", points: 36, maxPoints: 40 },
      ];
      for (const [i, checkpoint] of checkpoints.entries()) {
        const checkpointId = id + "-" + (i + 1);
        await tx.gradeCheckpoint.upsert({ where: { id: checkpointId }, create: { id: checkpointId, gradeId: id, ...checkpoint }, update: checkpoint });
      }
    }
  }

  for (const [index, record] of grades[username].slice(0, 3).entries()) {
    const id = `demo-grade-${username}-prev-${index}`;
    await tx.gradeRecord.upsert({
      where: { id },
      create: { id, ownerId, semester: semester - 1, subject: record.subject, teacher: record.teacher, kind: "Экзамен", score: index === 1 ? 4 : 5, status: "passed" },
      update: {},
    });
  }

  const id = `demo-deadline-${username}`;
  const deadline = username === "anna" ? {
    title: "Курсовая по бизнес-процессам",
    text: "Загрузите итоговую работу и схему бизнес-процессов.",
    calendarAt: new Date("2026-11-18T23:59:00+03:00"),
  } : {
    title: "Проект по базам данных",
    text: "Загрузите итоговую работу по базам данных.",
    calendarAt: new Date("2026-11-23T18:00:00+03:00"),
  };
  await tx.bulletin.upsert({
    where: { id },
    create: {
      id, kind: "deadline", audience: "student", target: ownerId, important: true,
      publishAt: new Date("2026-11-13T09:00:00+03:00"),
      ...deadline,
    },
    update: deadline,
  });
}
