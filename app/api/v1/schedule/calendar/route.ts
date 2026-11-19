import { calendarBody, escapeText, timestamp } from "../../../../../lib/calendar";
import { getRequestViewer } from "../../../../../lib/viewer";
import { scheduleDay, scheduleNow, scheduleRange, shiftDay, weekStart } from "../../../../../lib/schedule";

export async function GET(request: Request) {
  const viewer = await getRequestViewer();
  const headers = { "Cache-Control": "private, no-store" };
  if (!viewer) return new Response(null, { status: 401, headers });
  if (viewer.role !== "student" || !viewer.studentProfile) return new Response(null, { status: 403, headers });

  const params = new URL(request.url).searchParams;
  const day = scheduleDay(params.get("date") ?? undefined, scheduleNow(viewer.isDemo));
  const week = params.get("view") === "week";
  const first = week ? weekStart(day) : day;
  const lessons = await scheduleRange(viewer.studentProfile.group, first, week ? shiftDay(first, 6) : day, viewer.isDemo);
  const now = timestamp(new Date());
  const body = calendarBody(lessons.filter(lesson => lesson.status !== "cancelled").flatMap(lesson => [
      "BEGIN:VEVENT", `UID:${lesson.id}@deanery.example`, `DTSTAMP:${now}`, `DTSTART:${timestamp(lesson.startsAt)}`,
      `DTEND:${timestamp(lesson.endsAt)}`, `SUMMARY:${escapeText(lesson.subject)}`, `LOCATION:${escapeText(lesson.room)}`,
      `DESCRIPTION:${escapeText(lesson.kind + " · " + lesson.teacher)}`, "END:VEVENT",
    ]));

  return new Response(body, {
    headers: { ...headers, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="schedule.ics"' },
  });
}
