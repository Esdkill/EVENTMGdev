import { randomUUID } from "node:crypto";
import { CabinetShell } from "../../../cabinet-shell";
import { notFound, redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { requestDetails, requestMessages } from "../../../../lib/requests";
import { deliveries, requestNumber, requestTypes } from "../../../../lib/request-fields";
import { getRequestViewer } from "../../../../lib/viewer";
import { Badge, dateLabel, Initials, ProjectLabel, RequestHeader, RequestMessages, Timeline } from "../../../requests/request-ui";
import { MessageForm } from "./message-form";
import { StaffActions } from "./staff-actions";

export default async function StaffRequest({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") redirect("/cabinet");
  const { id } = await params;
  const request = await db.documentRequest.findUnique({
    where: { id },
    include: { ...requestDetails, messages: requestMessages, owner: { select: { name: true, email: true, studentProfile: true } } },
  });
  if (!request) notFound();
  const title = `Заявка № ${requestNumber(request.number)}`;
  const { owner } = request;
  const profile = owner.studentProfile;

  return (
    <CabinetShell role="staff" active="requests" viewer={viewer} pageTitle={title}>
      <main className="request-page">
        <RequestHeader title={title} staffName={viewer.name} staff back="/staff/requests" />
        <div className="staff-detail-layout">
          <div className="detail-stack">
            <section className="surface request-summary staff-request-overview">
              <div className="request-row action-row">
                <h2>Данные студента</h2><Badge status={request.status} staff />
              </div>
              <div className="staff-request-identity">
                <Initials name={owner.name} stored={profile} />
                <div>
                  <strong>{owner.name}</strong>
                  {profile && <p className="muted">{profile.group} · {profile.year} курс</p>}
                  <span className="staff-request-email">{owner.email}</span>
                </div>
              </div>
              <div className="staff-request-parameters">
                <h3>Параметры заявки</h3>
                <dl className="staff-request-fields">
                  <div><dt>Документ</dt><dd>{requestTypes[request.type]}</dd></div>
                  <div><dt>Цель</dt><dd>{request.purpose}</dd></div>
                  <div><dt>Способ получения</dt><dd>{deliveries[request.delivery]}</dd></div>
                  <div><dt>Экземпляры</dt><dd>{request.copies}</dd></div>
                  <div><dt>Подана</dt><dd><time dateTime={request.createdAt.toISOString()}>{dateLabel(request.createdAt, true)}</time></dd></div>
                </dl>
              </div>
              {request.comment && <div className="staff-request-comment">
                <h3>Комментарий студента</h3><p>{request.comment}</p>
              </div>}
            </section>
            <Timeline events={request.events} status={request.status} dueOn={request.dueOn} staff />
            <RequestMessages messages={request.messages}>
              <MessageForm key={request.messages.at(-1)?.id ?? "empty"} id={id} submissionKey={randomUUID()} />
            </RequestMessages>
            {request.document && <a className="secondary request-button" href={`/api/v1/files/${request.document.id}`}>Скачать прикреплённый PDF</a>}
          </div>
          <StaffActions key={request.version} id={id} version={request.version} status={request.status} electronic={request.delivery === "electronic"} note={request.staffNote} />
        </div>
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
