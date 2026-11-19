import type { Prisma } from "../generated/prisma/client";
import { syncDeadlineReminders } from "./deadline-reminders";
import { db } from "./db";

export const notificationLabels = {
  deadline: "Дедлайны",
  schedule: "Изменения расписания",
  request: "Статусы заявок",
  news: "Новости деканата",
} as const;

type Recipient = {
  id: string;
  role: string;
  isDemo: boolean;
  studentProfile: { faculty: string; year: number; group: string } | null;
};

export function visibleBulletins(viewer: Recipient): Prisma.BulletinWhereInput {
  const cohort = viewer.isDemo ? "demo" : "live";
  const publishAt = { lte: new Date() };
  if (viewer.role === "staff") {
    return { publishAt, publication: "published", kind: "news", cohort, audience: { in: ["everyone", "staff"] } };
  }
  if (viewer.role !== "student") return { id: { in: [] } };

  const profile = viewer.studentProfile;
  return {
    publishAt,
    publication: "published",
    AND: [{ OR: [{ kind: { notIn: ["news", "schedule"] }, cohort: null }, { cohort }] }, { OR: [
      { audience: "all" },
      { audience: "everyone" },
      { audience: "student", target: viewer.id },
      ...(profile ? [
        { audience: "faculty" as const, target: profile.faculty },
        { audience: "year" as const, target: String(profile.year) },
        { audience: "group" as const, target: profile.group },
      ] : []),
    ] }],
  };
}

export async function enabledBulletins(viewer: Recipient) {
  const preferences = viewer.role === "student"
    ? await db.notificationPreferences.findUnique({ where: { userId: viewer.id } })
    : null;
  if (viewer.role === "student" && preferences?.deadlines !== false) {
    await syncDeadlineReminders(viewer.id, viewer.isDemo);
  }
  return {
    ...visibleBulletins(viewer),
    kind: { in: [
      ...(viewer.role === "student" && preferences?.deadlines !== false ? ["deadline" as const] : []),
      ...(viewer.role === "student" && preferences?.schedule !== false ? ["schedule" as const] : []),
      ...(viewer.role === "student" && preferences?.requests !== false ? ["request" as const] : []),
      ...(preferences?.news === false ? [] : ["news" as const]),
    ] },
  } satisfies Prisma.BulletinWhereInput;
}
