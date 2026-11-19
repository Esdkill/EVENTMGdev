import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { visibleBulletins } from "../../lib/notifications";
import { getRequestViewer } from "../../lib/viewer";
import { StudentPromos } from "../cabinet/student-promos";
import { CabinetShell } from "../cabinet-shell";
import { NotificationNavigation } from "../notifications/notification-navigation";
import { CabinetState, dateLabel, Icon, ProjectLabel, RequestHeader } from "../requests/request-ui";
import "./news.css";

export default async function News() {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  const staff = viewer.role === "staff";
  const items = await db.bulletin.findMany({
    where: { ...visibleBulletins(viewer), kind: "news" },
    select: { id: true, title: true, text: true, publishAt: true, important: true },
    orderBy: [{ publishAt: "desc" }, { id: "desc" }],
  });

  return <CabinetShell role={staff ? "staff" : "student"} active="notifications" viewer={viewer}>
    <main className="request-page">
      <RequestHeader title="Уведомления" back="/more" end={null} />
      <NotificationNavigation view="news" />
      {items.length ? <ul className="request-list news-list">
        {items.map(item => <li key={item.id}>
          <Link className="surface request-card news-list-item" href={`/notifications/${item.id}?from=news`}>
            <span className={`bulletin-icon${item.important ? " bulletin-icon-important" : ""}`}><Icon name="staff-announcements" monochrome /></span>
            <div className="news-list-copy">
              <div className="request-row action-row"><strong>{item.title}</strong>
                {item.important && <span className="request-badge status-in_progress">Важное</span>}
              </div>
              <p className="muted bulletin-excerpt">{item.text}</p>
              <time className="muted" dateTime={item.publishAt.toISOString()}>{dateLabel(item.publishAt, false)}</time>
            </div>
            <Icon name="request-chevron" size={14} monochrome />
          </Link>
        </li>)}
      </ul> : <CabinetState icon="staff-announcements" title="Пока нет новостей" />}
      {viewer?.role === "student" && <StudentPromos viewer={viewer} placement="news" />}
      <ProjectLabel />
    </main>
  </CabinetShell>;
}
