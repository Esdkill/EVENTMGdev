"use server";

import { db } from "../../lib/db";
import { getRequestViewer } from "../../lib/viewer";

export async function readStudentSettings() {
  const viewer = await getRequestViewer();
  if (viewer?.role !== "student") return null;
  const [card, preferences] = await Promise.all([
    db.studentProfile.findUnique({ where: { userId: viewer.id }, select: { studentNumber: true } }),
    db.notificationPreferences.findUnique({
      where: { userId: viewer.id }, select: { deadlines: true, schedule: true, requests: true, news: true },
    }),
  ]);
  return { demo: viewer.isDemo, hasStudentNumber: Boolean(card?.studentNumber), preferences };
}
