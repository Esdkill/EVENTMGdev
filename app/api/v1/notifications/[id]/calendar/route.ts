import { calendarBody, escapeText, timestamp } from "../../../../../../lib/calendar";
import { deadlineReminderPrefix, syncDeadlineReminders } from "../../../../../../lib/deadline-reminders";
import { db } from "../../../../../../lib/db";
import { visibleBulletins } from "../../../../../../lib/notifications";
import { getRequestViewer } from "../../../../../../lib/viewer";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getRequestViewer();
  const headers = { "Cache-Control": "private, no-store" };
  if (!viewer) return new Response(null, { status: 401, headers });
  if (viewer.role !== "student") return new Response(null, { status: 403, headers });
  const { id } = await params;
  if (id.startsWith(deadlineReminderPrefix)) await syncDeadlineReminders(viewer.id, viewer.isDemo);
  const item = await db.bulletin.findFirst({ where: { ...visibleBulletins(viewer), id, calendarAt: { not: null } } });
  if (!item?.calendarAt) return new Response(null, { status: 404, headers });
  const body = calendarBody([
    "BEGIN:VEVENT", `UID:${item.id}@deanery.example`, `DTSTAMP:${timestamp(new Date())}`,
    `DTSTART:${timestamp(item.calendarAt)}`, `SUMMARY:${escapeText(item.title)}`,
    `DESCRIPTION:${escapeText(item.text)}`, "END:VEVENT",
  ]);
  return new Response(body, { headers: { ...headers, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="event.ics"' } });
}
