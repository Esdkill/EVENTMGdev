import { CabinetShell } from "../../cabinet-shell";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { requestStatus, requestType, requestTypes, statusLabels } from "../../../lib/request-fields";
import { getRequestViewer } from "../../../lib/viewer";
import { Badge, CabinetState, ProjectLabel, RequestHeader } from "../../requests/request-ui";

const listDate = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeZone: "Europe/Moscow" });

export default async function StaffRequests({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") redirect("/cabinet");
  const filters = await searchParams;
  const q = typeof filters.q === "string" ? filters.q.trim().slice(0, 100) : "";
  const status = requestStatus.safeParse(filters.status).data;
  const type = requestType.safeParse(filters.type).data;
  const group = typeof filters.group === "string" ? filters.group.slice(0, 50) : "";
  const sort = filters.sort === "oldest" ? "asc" : "desc";
  const filtered = Boolean(q || status || type || group);

  const [requests, groups] = await Promise.all([
    db.documentRequest.findMany({
      where: { status, type, owner: {
        ...(q ? { AND: q.split(/\s+/).map(word => ({ name: { contains: word, mode: "insensitive" as const } })) } : {}),
        ...(group ? { studentProfile: { group } } : {}),
      } },
      select: { id: true, status: true, type: true, createdAt: true, owner: { select: { name: true, studentProfile: { select: { group: true } } } } },
      orderBy: [{ createdAt: sort }, { id: sort }],
    }),
    db.studentProfile.findMany({ select: { group: true }, distinct: ["group"], orderBy: { group: "asc" } }),
  ]);

  return (
    <CabinetShell role="staff" active="requests" viewer={viewer}>
      <main className="request-page">
        <RequestHeader title="Заявки" staffName={viewer.name} staff />
        <form className="request-form staff-filters">
          <label className="field staff-search">Поиск по имени студента<input name="q" defaultValue={q} placeholder="Имя студента" maxLength={100} /></label>
          <label className="field">Статус<select name="status" defaultValue={status ?? ""}><option value="">Все статусы</option>{Object.entries(statusLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label className="field">Тип<select name="type" defaultValue={type ?? ""}><option value="">Все типы</option>{Object.entries(requestTypes).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label className="field">Группа<select name="group" defaultValue={group}><option value="">Все группы</option>{groups.map(({group}) => <option key={group}>{group}</option>)}</select></label>
          <label className="field">Дата<select name="sort" defaultValue={sort === "asc" ? "oldest" : "newest"}><option value="newest">Сначала новые</option><option value="oldest">Сначала старые</option></select></label>
          <button className="secondary staff-search">Применить фильтры</button>
        </form>
        {requests.length === 0 ? (
          <CabinetState icon="nav-requests" title={filtered ? "Заявки не найдены" : "Пока нет заявок"}
            description={filtered ? "Измените условия поиска или сбросьте фильтры." : "Входящие заявки студентов появятся здесь."}
            action={filtered && <Link className="secondary request-button" href="/staff/requests">Сбросить фильтры</Link>} />
        ) : (
          <ul className="request-list staff-request-list">
            <li className="staff-list-heading" aria-hidden="true">
              <span>Студент</span><span>Группа</span><span>Тип заявки</span><span>Дата</span><span>Статус</span>
            </li>
            {requests.map(request => (
              <li key={request.id}>
                <Link className="surface request-card" href={`/staff/requests/${request.id}`}>
                  <strong className="staff-list-name">{request.owner.name}</strong>
                  <span className="muted staff-list-mobile-meta">{request.owner.studentProfile?.group ?? "—"} · {listDate.format(request.createdAt)}</span>
                  <span className="muted staff-list-group">{request.owner.studentProfile?.group ?? "—"}</span>
                  <span className="staff-list-type">{requestTypes[request.type]}</span>
                  <span className="muted staff-list-date">{listDate.format(request.createdAt)}</span>
                  <Badge status={request.status} staff />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!!requests.length && <p className="muted">Найдено заявок · {requests.length}</p>}
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
