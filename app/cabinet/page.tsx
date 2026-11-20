import Link from "next/link";
import { redirect } from "next/navigation";
import type { Bulletin, Lesson } from "../../generated/prisma/client";
import { db } from "../../lib/db";
import { gradeSummary } from "../../lib/grades";
import { enabledBulletins } from "../../lib/notifications";
import { requestNumber, requestTypes, statusLabels } from "../../lib/request-fields";
import { lessonDay, lessonTime, nextLessonBreak, previousLessonSlot, scheduleDate, scheduleDay, scheduleNow, scheduleRange } from "../../lib/schedule";
import { getRequestViewer } from "../../lib/viewer";
import { CabinetNotificationsLink, CabinetShell } from "../cabinet-shell";
import { StudentPromos } from "./student-promos";
import { ProgressMeter } from "../progress-meter";
import { dateLabel, Icon, ProjectLabel, RequestHeader } from "../requests/request-ui";
import "./home.css";

type HomeEvent = Pick<Bulletin, "id" | "kind" | "title"> & { description: string; url: string };

const eventIcons = {
  deadline: "home-alarm",
  schedule: "schedule-change",
  request: "home-file-check",
  news: "nav-notifications",
};

const lessonKind = (kind: string) => kind === "Лабораторная" ? "Лабораторная работа" : kind;

function bulletinEvent(item: Bulletin, day: string): HomeEvent {
  let description = item.text;
  if (item.kind === "deadline" && item.calendarAt) {
    const date = lessonDay(item.calendarAt);
    const days = Math.round((Date.parse(date) - Date.parse(day)) / 86400_000);
    description = `До ${dateLabel(item.calendarAt, false, false)}, ${lessonTime(item.calendarAt)}`;
    if (days > 0) {
      const count = new Intl.PluralRules("ru").select(days);
      const unit = count === "one" ? "день" : count === "few" ? "дня" : "дней";
      description += ` · через ${days} ${unit}`;
    }
  }
  return { id: item.id, kind: item.kind, title: item.title, description, url: `/notifications/${item.id}` };
}

function LessonCard({ lesson, current }: { lesson: Lesson; current: boolean }) {
  const previous = lesson.status === "rescheduled" ? previousLessonSlot(lesson) : "";
  return (
    <Link className="home-next-lesson" href="/schedule">
      <div className="home-lesson-top">
        <p>{current ? "Идёт сейчас" : "Следующая пара"}</p>
        {lesson.status === "rescheduled" && <span className="home-lesson-chip home-warning">Перенос</span>}
      </div>
      <div className="home-next-details">
        <div className="home-next-time">
          <strong>{lessonTime(lesson.startsAt)}</strong>
          <span>до {lessonTime(lesson.endsAt)}</span>
        </div>
        <div className="home-next-subject">
          <h2>{lesson.subject}</h2>
          <p>{lessonKind(lesson.kind)}</p>
        </div>
      </div>
      <div className="home-next-room">
        <Icon name="schedule-room" size={14} monochrome />
        <span>{lesson.room} · {lesson.teacher}</span>
        <Icon name="home-arrow-up" size={16} monochrome />
      </div>
      {previous && <p className="home-next-previous">Было {previous}</p>}
    </Link>
  );
}

function TodaySchedule({ day, lessons, next, now }: { day: string; lessons: Lesson[]; next?: Lesson; now: Date }) {
  const otherLessons = next ? lessons.filter(lesson => lesson.id !== next.id) : lessons;
  const allCancelled = lessons.length > 0 && lessons.every(lesson => lesson.status === "cancelled");
  return (
    <section className="home-day cabinet-glass" aria-label="Занятия на сегодня">
      <div className="home-section-heading home-day-heading home-desktop">
        <div><h2>Занятия на сегодня</h2><time className="muted" dateTime={day}>{scheduleDate(day, { day: "numeric", month: "long" })}</time></div>
        <Link href="/schedule">Всё расписание →</Link>
      </div>
      {next ? <LessonCard lesson={next} current={next.startsAt <= now} /> : <p className="home-panel home-no-lesson muted">
        {allCancelled ? "Все занятия на сегодня отменены." : lessons.length ? "Сегодня занятий больше нет." : "Сегодня в расписании нет занятий."}
      </p>}
      {otherLessons.length > 0 && <div className="home-today home-desktop">
        {next && <h3>Другие занятия</h3>}
        <ul className="home-lesson-list">
          {otherLessons.map(lesson => {
            const previous = lesson.status === "rescheduled" ? previousLessonSlot(lesson) : "";
            return <li key={lesson.id} className={`home-lesson-row home-lesson-${lesson.status}`}>
              <div className="home-row-time">
                <strong>{lessonTime(lesson.startsAt)}</strong>
                <small>до {lessonTime(lesson.endsAt)}</small>
              </div>
              <div className="home-row-details">
                <p><strong>{lesson.subject}</strong> <small>{lesson.kind === "Лабораторная" ? "Лаб." : lesson.kind}</small></p>
                <small>{lesson.room} · {lesson.teacher}</small>
                {previous && <small className="home-row-change">Было {previous}</small>}
                {lesson.status === "cancelled" && <small className="home-row-change">Занятие отменено · без замены</small>}
              </div>
              {lesson.status === "rescheduled" && <span className="home-lesson-chip home-warning">Перенос</span>}
              {lesson.status === "cancelled" && <span className="home-lesson-chip home-rejected">Отмена</span>}
            </li>;
          })}
        </ul>
      </div>}
    </section>
  );
}

function HomeActions() {
  return (
    <nav className="home-actions" aria-label="Действия">
      <Link className="primary request-button" href="/requests/new"><Icon name="home-file-plus" size={20} monochrome />Заказать справку</Link>
      <Link className="home-contact" href="/messages/new">Написать в деканат</Link>
    </nav>
  );
}

function ImportantEvents({ events }: { events: HomeEvent[] }) {
  return (
    <section className="home-important" aria-labelledby="home-important-title">
      <div className="home-section-heading">
        <h2 id="home-important-title">Что изменилось</h2><Link href="/notifications">Все события</Link>
      </div>
      {events.length ? <ul className="home-event-list">
        {events.map(event => <li key={event.id}><Link href={event.url}>
          <span className={`home-event-icon home-event-${event.kind}`}><Icon name={eventIcons[event.kind]} size={17} monochrome /></span>
          <span className="home-event-copy"><strong>{event.title}</strong><small>{event.description}</small></span>
          <Icon name="request-chevron" size={14} monochrome />
        </Link></li>)}
      </ul> : <div className="home-panel"><p className="muted">Новых изменений пока нет.</p></div>}
    </section>
  );
}

export default async function StudentCabinet() {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role === "staff") redirect("/staff");
  if (viewer.role !== "student" || !viewer.studentProfile) redirect("/help");

  const { group, year } = viewer.studentProfile;
  const now = scheduleNow(viewer.isDemo);
  const day = scheduleDay(undefined, now);
  const where = await enabledBulletins(viewer);
  const unreadWhere = { ...where, reads: { none: { userId: viewer.id } } };
  const [lessons, term, news, unread, importantUnread, latestRequest] = await Promise.all([
    scheduleRange(group, day, day, viewer.isDemo),
    db.gradeRecord.findFirst({ where: { ownerId: viewer.id }, orderBy: { semester: "desc" }, select: { semester: true } }),
    db.bulletin.findMany({ where, orderBy: [{ important: "desc" }, { publishAt: "desc" }, { id: "desc" }], take: 3 }),
    db.bulletin.count({ where: unreadWhere }),
    where.kind.in.includes("news") ? db.bulletin.count({ where: { ...unreadWhere, kind: "news", important: true } }).then(total => total > 0) : false,
    where.kind.in.includes("request") ? db.documentRequest.findFirst({
      where: { ownerId: viewer.id, status: { in: ["NEW", "IN_PROGRESS", "READY", "ISSUED"] } },
      orderBy: [{ createdAt: "desc" }, { number: "desc" }],
      select: { id: true, number: true, status: true, type: true, dueOn: true, delivery: true },
    }) : null,
  ]);
  const summary = gradeSummary(term ? await db.gradeRecord.findMany({ where: { ownerId: viewer.id, semester: term.semester }, select: { score: true, status: true } }) : []);
  const next = lessons.find(lesson => lesson.status !== "cancelled" && lesson.endsAt > now);
  const lessonBreak = nextLessonBreak(lessons, now);
  const events = news.map(item => bulletinEvent(item, day));
  const change = lessons.find(lesson => lesson.status === "cancelled") ??
    lessons.find(lesson => lesson.status === "rescheduled" && lesson.id !== next?.id);
  if (change && where.kind.in.includes("schedule") && !events.some(event => event.kind === "schedule")) {
    const cancelled = change.status === "cancelled";
    events.unshift({
      id: change.id, kind: "schedule", title: `${change.subject} · ${cancelled ? "отмена" : "перенос"}`,
      description: cancelled ? `Занятие в ${lessonTime(change.startsAt)} отменено` :
        `Сегодня в ${lessonTime(change.startsAt)} · аудитория ${change.room}`,
      url: `/schedule?date=${day}`,
    });
  }
  if (events.length < 3 && latestRequest && !events.some(event => event.kind === "request")) {
    const { id, type, number, dueOn, status, delivery } = latestRequest;
    const title = `${requestTypes[type]} · № ${requestNumber(number)}`;
    const detail = status === "NEW" || status === "IN_PROGRESS"
      ? `будет готова ${dateLabel(dueOn, false, false)}`
      : status === "READY" ? (delivery === "electronic" ? "документ доступен" : "можно забрать в деканате") : "";
    events.push({ id, kind: "request", title, description: [status === "NEW" ? "Подана" : statusLabels[status], detail].filter(Boolean).join(" · "), url: `/requests/${id}` });
  }
  const formattedDate = scheduleDate(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(/ г\.$/, "");
  const date = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  const academicYear = Number(day.slice(0, 4)) - (Number(day.slice(5, 7)) < 9 ? 1 : 0);
  const groupLabel = `${group} · ${year} курс`;

  return (
    <CabinetShell role="student" active="home" viewer={viewer} unread={unread} importantUnread={importantUnread}>
      <main className="student-home">
        <div className="home-mobile">
          <RequestHeader title="Главная" subtitle={groupLabel} end={<CabinetNotificationsLink unread={unread} important={importantUnread} />} />
        </div>
        <header className="home-greeting">
          <div>
            <h1 className="home-desktop">Главная</h1>
            <p className="muted home-mobile"><time dateTime={day}>{date}</time></p>
            <div className="home-session home-desktop">
              <span className="muted">{groupLabel}</span>
              {term && <span className="home-semester">Семестр {term.semester} · {academicYear}/{String(academicYear + 1).slice(-2)}</span>}
            </div>
          </div>
        </header>
        <div className="home-grid">
          <TodaySchedule day={day} lessons={lessons} next={next} now={now} />
          <div className="home-side">
            <ImportantEvents events={events.slice(0, 3)} />
            <HomeActions />
            {summary.total > 0 && <Link className="home-panel home-progress home-desktop" href="/grades">
              <div><h2>Ваш прогресс</h2><Icon name="nav-grades" size={20} monochrome /></div>
              <dl>
                <div><dt>Средний балл</dt><dd>{summary.average}</dd></div>
                <div><dt>Уже сдано</dt><dd>{summary.passed} из {summary.total}</dd></div>
              </dl>
              <ProgressMeter value={summary.passed} max={summary.total} label="Сданные дисциплины" />
            </Link>}
          </div>
          {lessonBreak && <div className="home-lesson-break">
            <span className="home-coffee" aria-hidden="true"><span /></span>
            <div>
              <h3>Есть время на кофе</h3>
              <p className="muted"><time dateTime={lessonBreak.start.toISOString()}>{lessonTime(lessonBreak.start)}</time>–<time dateTime={lessonBreak.end.toISOString()}>{lessonTime(lessonBreak.end)}</time> · {lessonBreak.minutes} мин</p>
            </div>
          </div>}
        </div>
        <StudentPromos placement="home" />
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
