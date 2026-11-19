import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { studyGroupCodes } from "../../../lib/study-groups";
import { getViewer } from "../../../lib/viewer";
import { lessonDay, lessonTime, scheduleDay, scheduleNow } from "../../../lib/schedule";
import { CabinetShell } from "../../cabinet-shell";
import { ProjectLabel, RequestHeader } from "../../requests/request-ui";
import { ScheduleChangeForm } from "./change-form";
import { ScheduleCreateForm } from "./create-form";

export default async function StaffSchedule({ searchParams }: { searchParams: Promise<{ group?: string; saved?: string; mode?: string; date?: string; lesson?: string; cohort?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") redirect("/cabinet");
  const query = await searchParams;
  const groups = await studyGroupCodes();
  const group = groups.find(code => code === query.group) ?? "";
  const cohort = query.cohort === "demo" || query.cohort === "live" ? query.cohort : "";
  const adding = query.mode === "add";
  const lessons = group && !adding ? await db.lesson.findMany({ where: { group }, orderBy: [{ startsAt: "asc" }, { id: "asc" }] }) : [];
  const groupQuery = group ? `group=${encodeURIComponent(group)}` : "";
  const added = adding && group && (query.saved === "added" || query.saved === "notified");
  return (
    <CabinetShell role="staff" active="schedule" viewer={viewer}>
      <main className="request-page">
        <RequestHeader title="Расписание" staffName={viewer.name} staff />
        <nav className="schedule-view staff-work-tabs" aria-label="Работа с расписанием">
          <Link href={`/staff/schedule?mode=add${groupQuery ? "&" + groupQuery : ""}`} aria-current={adding ? "page" : undefined}>Добавить занятие</Link>
          <Link href={`/staff/schedule${groupQuery ? "?" + groupQuery : ""}`} aria-current={adding ? undefined : "page"}>Перенос и отмена</Link>
        </nav>
        {query.saved === "1" && <p className="request-callout" role="status">Изменение сохранено. Уведомление опубликовано для группы.</p>}
        {added && <p className="request-callout" role="status">
          Занятие добавлено в расписание группы {group}.{query.saved === "notified" && " Уведомление опубликовано."}
        </p>}
        {adding ? <ScheduleCreateForm key={group + ":" + (query.lesson ?? "")} groups={groups} initialGroup={group} initialCohort={cohort} initialDay={scheduleDay(query.date, scheduleNow(viewer.isDemo))} />
        : <ScheduleChangeForm key={group + ":" + lessons.map(lesson => lesson.id + ":" + lesson.version).join(",")} groups={groups} initialGroup={group} lessons={lessons.map(lesson => ({
          id: lesson.id, subject: lesson.subject, cohort: lesson.cohort, room: lesson.room, version: lesson.version, status: lesson.status,
          start: lessonDay(lesson.startsAt) + "T" + lessonTime(lesson.startsAt),
          end: lessonDay(lesson.endsAt) + "T" + lessonTime(lesson.endsAt),
        }))} />}
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
