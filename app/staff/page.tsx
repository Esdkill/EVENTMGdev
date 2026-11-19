import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { requestTypes } from "../../lib/request-fields";
import { scheduleDate, scheduleDay, scheduleNow } from "../../lib/schedule";
import { getViewer } from "../../lib/viewer";
import { CabinetShell } from "../cabinet-shell";
import { Badge, ProjectLabel, RequestHeader } from "../requests/request-ui";

const shortDate = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "Europe/Moscow" });

export default async function StaffCabinet() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") redirect("/cabinet");

  const day = scheduleDay(undefined, scheduleNow(viewer.isDemo));
  const today = new Date(day + "T00:00:00Z");
  const [fresh, working, late, requests, [messageCount]] = await Promise.all([
    db.documentRequest.count({ where: { status: "NEW" } }),
    db.documentRequest.count({ where: { status: "IN_PROGRESS" } }),
    db.documentRequest.count({ where: { status: { in: ["NEW", "IN_PROGRESS"] }, dueOn: { lt: today } } }),
    db.documentRequest.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 2,
      include: { owner: { select: { name: true, studentProfile: { select: { group: true } } } } } }),
    db.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::integer AS count
      FROM "DeanThread" AS thread
      CROSS JOIN LATERAL (
        SELECT "authorId", "createdAt"
        FROM "DeanMessage"
        WHERE "threadId" = thread.id
        ORDER BY "createdAt" DESC, id DESC
        LIMIT 1
      ) AS latest
      WHERE latest."authorId" = thread."ownerId"
        AND (thread."staffReadAt" IS NULL OR latest."createdAt" > thread."staffReadAt")
    `,
  ]);
  const counters = [{ value: fresh, label: "Новые заявки", key: "new" },
    { value: working, label: "В работе", key: "working" }, { value: late, label: "Просрочено", key: "late" }];

  return (
    <CabinetShell role="staff" active="home" viewer={viewer}>
      <main className="request-page staff-overview">
        <RequestHeader title="Главная" staffName={viewer.name} staff />
        <div className="cabinet-overview-grid">
          <div className="detail-stack">
            <dl className="staff-counts">
              {counters.map(({ label, value, key }) => <div className={`surface staff-counter staff-counter-${key}`} key={key}>
                <dt>{label}</dt><dd>{value}</dd>
              </div>)}
            </dl>
            <h2>Последние заявки</h2>
            <ul className="request-list">{requests.map(request => <li key={request.id}>
              <Link className="surface request-card staff-recent-request" href={`/staff/requests/${request.id}`}>
                <strong>{request.owner.name}</strong>
                <p className="muted">{[request.owner.studentProfile?.group, shortDate.format(request.createdAt)].filter(Boolean).join(" · ")}</p>
                <p>{requestTypes[request.type]}</p>
                <Badge status={request.status} staff />
              </Link>
            </li>)}{!requests.length && <li className="surface request-summary"><p className="muted">Заявки студентов появятся здесь.</p></li>}</ul>
            <Link className="secondary request-button staff-overview-link" href="/staff/requests">Все заявки</Link>
          </div>
          <section className="surface request-summary staff-today">
            <h2>Сегодня, {scheduleDate(day, { day: "numeric", month: "long" })}</h2>
            <p>Непрочитанные сообщения · {messageCount.count}</p>
            <Link className="secondary request-button staff-overview-link" href="/messages">Открыть сообщения</Link>
          </section>
        </div>
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
