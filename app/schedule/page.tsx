import { ScheduleMode } from "./schedule-mode";
import Link from "next/link";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import type { Lesson } from "../../generated/prisma/client";
import { db } from "../../lib/db";
import { getRequestViewer } from "../../lib/viewer";
import { lessonDay, lessonTime, previousLessonSlot, scheduleDate, scheduleDay, scheduleNow, scheduleRange, shiftDay, weekStart } from "../../lib/schedule";
import { CabinetShell } from "../cabinet-shell";
import { CabinetState, Icon, ProjectLabel, RequestHeader } from "../requests/request-ui";
import "./schedule.css";

const changes = { rescheduled: "Перенос", cancelled: "Отмена", planned: "По плану" };
const columns = ["Время", "Дисциплина", "Аудитория и преподаватель", "Статус"];

export default async function SchedulePage({ searchParams }: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "student" || !viewer.studentProfile) redirect("/staff");
  const query = await searchParams;
  const now = scheduleNow(viewer.isDemo);
  const today = scheduleDay(undefined, now);
  const day = scheduleDay(query.date, now);
  const isWeek = query.view === "week";
  const view = isWeek ? "week" : "day";
  const monday = weekStart(day);
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
  const { group, year } = viewer.studentProfile;
  const [weekLessons, preferences] = await Promise.all([
    scheduleRange(group, monday, days[6], viewer.isDemo),
    db.notificationPreferences.findUnique({ where: { userId: viewer.id }, select: { schedule: true } }),
  ]);
  const daysWithLessons = new Set(weekLessons.map(lesson => lessonDay(lesson.startsAt)));
  const displayDays = day === days[6] || daysWithLessons.has(days[6]) ? days : days.slice(0, 6);
  const lessons = isWeek ? weekLessons : weekLessons.filter(lesson => lessonDay(lesson.startsAt) === day);
  const lastDay = displayDays.at(-1)!;
  const visibleDays = isWeek ? displayDays : [day];
  const changed = lessons.filter(lesson => lesson.status !== "planned");
  const calendarHref = lessons.some(lesson => lesson.status !== "cancelled") ? `/api/v1/schedule/calendar?date=${day}&view=${view}` : null;
  const url = (date: string, mode = view) => `/schedule?date=${date}&view=${mode}`;
  const dayNumber = (value: string) => scheduleDate(value, { day: "numeric" });
  const weekLabel = monday.slice(0, 7) === lastDay.slice(0, 7)
    ? dayNumber(monday)
    : scheduleDate(monday, { day: "numeric", month: "long" });

  const referenceMonday = weekStart("2026-11-16");
  const weekOffset = Math.round((Date.parse(monday) - Date.parse(referenceMonday)) / (7 * 86400_000));
  const weekLabelDetail = viewer.isDemo && 12 + weekOffset > 0 ? ` · учебная неделя ${12 + weekOffset}` : "";

  return (
    <CabinetShell role="student" active="schedule" viewer={viewer}>
      <main className="request-page schedule-page">
        <div className="schedule-content">
          <div className="schedule-heading">
            <RequestHeader title="Расписание" subtitle={`${group} · ${year} курс${weekLabelDetail}`} end={null} />
            {calendarHref && <a className="secondary request-button schedule-export" href={calendarHref}>
              <Icon name="schedule-export" size={18} monochrome /><span className="schedule-export-label">В календарь</span>
            </a>}
          </div>
          <section className="schedule-controls" aria-label="Период расписания">
            <div className="schedule-week-picker">
              <Link className="icon-button" href={url(shiftDay(day, -7))} aria-label="Предыдущая неделя"><Icon name="schedule-prev" monochrome /></Link>
              <strong>{weekLabel}–{scheduleDate(lastDay, { day: "numeric", month: "long", year: "numeric" }).replace(/ г\.$/, "")}</strong>
              <Link className="icon-button" href={url(shiftDay(day, 7))} aria-label="Следующая неделя"><Icon name="schedule-next" monochrome /></Link>
            </div>
            <ScheduleMode isWeek={isWeek} dayHref={url(day, "day")} weekHref={url(day, "week")} />
            <Link className="secondary request-button schedule-today" href="/schedule">Сегодня</Link>
            <nav className="schedule-days" style={{ "--day-count": displayDays.length } as CSSProperties} aria-label="Дни недели">
              {displayDays.map(value => (
                <Link key={value} href={url(value, "day")} aria-current={value === day ? "date" : undefined}
                  aria-label={scheduleDate(value, { weekday: "long", day: "numeric", month: "long" }) + (daysWithLessons.has(value) ? " · есть занятия" : "")}>
                  <span>{scheduleDate(value, { weekday: "short" })}</span>
                  <strong>{dayNumber(value)}</strong>
                  {daysWithLessons.has(value) && <i aria-hidden="true" />}
                </Link>
              ))}
            </nav>
          </section>
          {visibleDays.map(value => {
            const daily = lessons.filter(lesson => lessonDay(lesson.startsAt) === value);
            return (
              <section key={value} className="schedule-day">
                {isWeek && <h2><Link href={url(value, "day")}>{scheduleDate(value, { weekday: "long", day: "numeric", month: "long" })}</Link></h2>}
                {daily.length ? (
                  <div className="schedule-table" role="table" aria-label={`Занятия на ${scheduleDate(value, { day: "numeric", month: "long" })}`}>
                    <div className="schedule-table-head" role="row">{columns.map(column => <span key={column} role="columnheader">{column}</span>)}</div>
                    <div className="schedule-table-rows" role="rowgroup">
                      {daily.map(lesson => <LessonRow key={lesson.id} lesson={lesson} now={now} />)}
                    </div>
                  </div>
                ) : (
                  isWeek ? <p className="schedule-empty-day muted">В этот день занятий нет</p> :
                    <CabinetState icon="schedule-calendar" title="В этот день занятий нет"
                      action={<Link className="secondary request-button" href={day === today ? url(day, "week") : "/schedule"}>
                        {day === today ? "Открыть неделю" : "К сегодняшнему дню"}
                      </Link>} />
                )}
              </section>
            );
          })}
          <ScheduleNotices changed={changed} weekly={isWeek} enabled={preferences?.schedule ?? true} />
        </div>
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}

function LessonRow({ lesson, now }: { lesson: Lesson; now: Date }) {
  const current = lesson.status === "planned" && lesson.startsAt <= now && lesson.endsAt > now;
  const status = current ? "current" : lesson.status;
  const previous = lesson.status === "rescheduled" ? previousLessonSlot(lesson) : "";
  return <div role="row" className={`lesson-row lesson-${status}`}>
    <div className="lesson-time" role="cell">
      <time dateTime={lesson.startsAt.toISOString()}>{lessonTime(lesson.startsAt)}</time>
      <span>–</span><time dateTime={lesson.endsAt.toISOString()}>{lessonTime(lesson.endsAt)}</time>
    </div>
    <div className="lesson-title" role="cell">
      <strong>{lesson.subject}</strong>
      <small>{lesson.kind}</small>
      {previous && <small>Было {previous}</small>}
      {lesson.changeReason && <small>{lesson.changeReason}</small>}
    </div>
    <div className="lesson-location" role="cell">
      <span>{lesson.room}</span><small>{lesson.teacher}</small>
    </div>
    <div className="lesson-status" role="cell">
      <span className={`request-badge lesson-label-${status}`}>{current ? "Идёт сейчас" : changes[lesson.status]}</span>
    </div>
  </div>;
}

function ScheduleNotices({ changed, weekly, enabled }: { changed: Lesson[]; weekly: boolean; enabled: boolean }) {
  return <div className="surface schedule-notices">
    {changed.length ? <details className="schedule-change-summary">
      <summary className="schedule-notice-row">
        <Icon name="schedule-change" size={18} monochrome />
        <span>Изменения расписания <small>· {changed.length}</small></span>
        <Icon name="request-chevron" size={14} monochrome />
      </summary>
      <ul className="schedule-change-list">
        {changed.map(lesson => {
          const lessonDate = lessonDay(lesson.startsAt);
          return <li key={lesson.id}>
            <div>
              <strong>{lesson.subject}</strong>
              <p className="muted">
                {weekly && <><time dateTime={lessonDate}>{scheduleDate(lessonDate, { day: "numeric", month: "short" })}</time>{" · "}</>}
                {lessonTime(lesson.startsAt)}–{lessonTime(lesson.endsAt)} · {lesson.room}
              </p>
            </div>
            <span className={`request-badge lesson-label-${lesson.status}`}>{changes[lesson.status]}</span>
          </li>;
        })}
      </ul>
    </details> : <p className="schedule-notice-row muted"><Icon name="schedule-change" size={18} monochrome />Переносов и отмен нет</p>}
    <p className="schedule-notice-row schedule-notice-status">
      <Icon name="schedule-notice" size={18} monochrome />
      <span>Уведомления об изменениях <small>· {enabled ? "включены" : "выключены"}</small></span>
    </p>
  </div>;
}
