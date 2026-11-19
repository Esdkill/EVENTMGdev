import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { enabledBulletins, notificationLabels } from "../../lib/notifications";
import { getRequestViewer } from "../../lib/viewer";
import { CabinetShell } from "../cabinet-shell";
import { dateLabel, CabinetState, Icon, ProjectLabel, RequestHeader } from "../requests/request-ui";
import { readNotifications } from "./actions";
import { NotificationNavigation } from "./notification-navigation";

export default async function Notifications() {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  const staff = viewer.role === "staff";
  const home = staff ? "/staff" : "/cabinet";
  const items = await db.bulletin.findMany({
    where: await enabledBulletins(viewer), orderBy: [{ publishAt: "desc" }, { id: "desc" }],
    include: { reads: { where: { userId: viewer.id }, select: { userId: true } } }, take: 100,
  });
  const unread = items.filter(item => !item.reads.length);
  const groups = [
    { title: `Новые · ${unread.length}`, items: unread, unread: true },
    { title: "Прочитанные", items: items.filter(item => item.reads.length), unread: false },
  ];
  const markAll = readNotifications.bind(null, undefined);
  return (
    <CabinetShell role={staff ? "staff" : "student"} active="notifications" viewer={viewer}>
      <main className="request-page notifications-page">
        <RequestHeader title="Уведомления" back="/more" end={null} />
        <NotificationNavigation view="all" />
        {!items.length && <CabinetState icon="home-bell" title="Пока нет уведомлений"
          description={staff ? "Здесь появятся объявления для сотрудников." : "Здесь появятся новости, дедлайны, изменения расписания и статусы заявок."}
          action={<Link className="secondary request-button" href={home}>На главную</Link>} />}
        {groups.map(group => group.items.length > 0 && <section className="detail-stack notification-group" key={group.title}>
          <div className="request-row">
            <h2>{group.title}</h2>
            {group.unread && <form action={markAll}><button className="text-action">Прочитать все</button></form>}
          </div>
          <ul className="request-list">{group.items.map(item => <li key={item.id}>
            <Link className={`surface request-card bulletin-card${group.unread ? " bulletin-card-new" : ""}`} href={`/notifications/${item.id}`}>
              <span className="bulletin-marker">
                <span className={`bulletin-icon bulletin-icon-${item.kind}${item.kind === "news" && item.important ? " bulletin-icon-important" : ""}`}>
                  <Icon name={item.kind === "schedule" ? "schedule-change" : item.kind === "request" ? "home-file-check" : item.kind === "deadline" ? "home-alarm" : "staff-announcements"} size={17} monochrome />
                </span>
                {item.important && <span className="bulletin-priority">Важное</span>}
              </span>
              <div className="bulletin-copy">
                <div className="bulletin-heading">
                  <strong>{item.title}</strong>
                  <span className="bulletin-state">{group.unread ? "Новое" : "Прочитано"}</span>
                </div>
                <p className="muted bulletin-excerpt">{item.text}</p>
                <p className="muted">{notificationLabels[item.kind]} · {dateLabel(item.publishAt, true)}</p>
              </div>
              <Icon name="request-chevron" size={14} monochrome />
            </Link>
          </li>)}</ul>
        </section>)}
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
