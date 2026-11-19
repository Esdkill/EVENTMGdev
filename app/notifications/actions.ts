"use server";

import type { NotificationPreferences } from "../../generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { enabledBulletins, visibleBulletins } from "../../lib/notifications";
import { getRequestViewer } from "../../lib/viewer";

export async function readNotifications(id?: string) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  const bulletins = await db.bulletin.findMany({
    where: { ...(id ? visibleBulletins(viewer) : await enabledBulletins(viewer)), id, reads: { none: { userId: viewer.id } } },
    select: { id: true },
  });
  if (bulletins.length) await db.notificationRead.createMany({
    data: bulletins.map(bulletin => ({ userId: viewer.id, bulletinId: bulletin.id })),
    skipDuplicates: true,
  });
  revalidatePath("/notifications");
  if (id) revalidatePath(`/notifications/${id}`);
}

type Preferences = Pick<NotificationPreferences, "deadlines" | "schedule" | "requests" | "news">;

export async function saveNotificationPreferences(_state: { error: string; preferences?: Preferences }, form: FormData) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "student") return { error: "Настройки доступны студенту." };
  const preferences = {
    deadlines: form.get("deadlines") === "on", schedule: form.get("schedule") === "on",
    requests: form.get("requests") === "on", news: form.get("news") === "on",
  };
  await db.notificationPreferences.upsert({ where: { userId: viewer.id }, create: { userId: viewer.id, ...preferences }, update: preferences });
  revalidatePath("/notifications");
  revalidatePath("/schedule");
  return { error: "", preferences };
}
