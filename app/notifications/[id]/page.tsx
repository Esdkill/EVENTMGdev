import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deadlineReminderPrefix, syncDeadlineReminders } from "../../../lib/deadline-reminders";
import { db } from "../../../lib/db";
import { notificationLabels, visibleBulletins } from "../../../lib/notifications";
import { getRequestViewer } from "../../../lib/viewer";
import { CabinetShell } from "../../cabinet-shell";
import { dateLabel, Icon, ProjectLabel, RequestHeader } from "../../requests/request-ui";
import { readNotifications } from "../actions";

export default async function NotificationDetail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }>;
}) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  const staff = viewer.role === "staff";
  const { id } = await params;
  const gradeReminder = id.startsWith(deadlineReminderPrefix);
  if (gradeReminder && !staff) await syncDeadlineReminders(viewer.id, viewer.isDemo);
  const item = await db.bulletin.findFirst({
    where: { ...visibleBulletins(viewer), id },
    include: { reads: { where: { userId: viewer.id } }, attachment: { select: { name: true } } },
  });
  if (!item) notFound();
  const fromNews = item.kind === "news" && (await searchParams).from === "news";
  return (
    <CabinetShell role={staff ? "staff" : "student"} active="notifications" viewer={viewer} pageTitle={fromNews ? "Новость" : "Уведомление"}>
      <main className="request-page">
        <RequestHeader title={fromNews ? "Новость" : "Уведомление"} back={fromNews ? "/news" : "/notifications"} />
        <section className="surface request-summary">
          <div><span className={`request-badge${item.kind === "deadline" ? " status-in_progress" : ""}`}>{notificationLabels[item.kind]}</span></div>
          <h2>{item.title}</h2>
          <p className="muted">{dateLabel(item.publishAt, true)} · Деканат</p>
          <p className="preserve-lines">{item.text}</p>
          {item.calendarAt && <p className="request-date request-with-icon"><Icon name="request-calendar" monochrome />{dateLabel(item.calendarAt, true)}</p>}
        </section>
        <div className="detail-stack">
          {item.attachment && <a className="surface notification-attachment" href={`/api/v1/notifications/${id}/attachment`}>
            <span className="notification-attachment-icon"><Icon name="request-file" size={20} monochrome /></span>
            <span><strong>{item.attachment.name}</strong><span className="muted">Скачать вложение</span></span>
          </a>}
          {item.href && <Link className="primary request-button" href={item.href}>Открыть {item.kind === "request" ? "заявку" : gradeReminder ? "дисциплину" : "расписание"}</Link>}
          {item.calendarAt && <a className="primary request-button" href={`/api/v1/notifications/${id}/calendar`}>Добавить в календарь</a>}
          {!item.reads.length && <form action={readNotifications.bind(null, id)}><button className="secondary">Отметить прочитанным</button></form>}
        </div>
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
