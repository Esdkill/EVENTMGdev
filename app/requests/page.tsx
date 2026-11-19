import { CabinetShell } from "../cabinet-shell";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { getRequestViewer } from "../../lib/viewer";
import { requestNumber, requestTypes } from "../../lib/request-fields";
import { Badge, dateLabel, CabinetState, Icon, ProjectLabel, RequestHeader } from "./request-ui";

export default async function Requests() {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "student") redirect("/staff");
  const requests = await db.documentRequest.findMany({ where: { ownerId: viewer.id }, orderBy: { createdAt: "desc" } });

  return (
    <CabinetShell role="student" active="requests" viewer={viewer}>
      <main className="request-page request-index">
        <RequestHeader title="Заявки и справки" />
        {!!requests.length && <Link className="primary request-button request-list-action" href="/requests/new"><Icon name="request-plus" size={18} monochrome />Новая заявка</Link>}
        {!!requests.length && <aside className="request-callout"><strong>От подачи до получения</strong><p>Подана → В работе → Готова → Выдана</p></aside>}
        {requests.length === 0 ? (
          <CabinetState icon="nav-requests" title="Пока нет заявок"
            description="Подайте заявку на справку или выписку."
            action={<Link className="primary request-button" href="/requests/new"><Icon name="request-plus" size={16} monochrome />Новая заявка</Link>} />
        ) : (
          <ul className="request-list cabinet-glass request-document-list">
            {requests.map((request) => (
              <li key={request.id}>
                <Link href={`/requests/${request.id}`} className="request-card request-document-row">
                  <span className="request-document-icon"><Icon name={request.status === "READY" || request.status === "ISSUED" ? "home-file-check" : "request-file"} size={20} monochrome /></span>
                  <div className="request-document-name">
                    <strong>{requestTypes[request.type]}</strong>
                    <span className="muted">Заявка № {requestNumber(request.number)}</span>
                  </div>
                  <div className="request-document-dates">
                    <p className="muted">Подана <time dateTime={request.createdAt.toISOString()}>{dateLabel(request.createdAt)}</time></p>
                    {(request.status === "NEW" || request.status === "IN_PROGRESS") && <p className="muted">Будет готова <time dateTime={request.dueOn.toISOString()}>{dateLabel(request.dueOn)}</time></p>}
                    {request.status === "READY" && <p className="status-ready-text">{request.delivery === "pickup" ? "Заберите в деканате · каб. А-101" : "Документ доступен для скачивания"}</p>}
                  </div>
                  <div className="request-document-status"><Badge status={request.status} /></div>
                  <Icon name="request-chevron" size={14} monochrome />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
