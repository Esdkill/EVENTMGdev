import { CabinetShell } from "../../cabinet-shell";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { requestDetails, requestMessages } from "../../../lib/requests";
import { deliveries, requestNumber, requestTypes } from "../../../lib/request-fields";
import { getRequestViewer } from "../../../lib/viewer";
import { OnceMotion } from "../../once-motion";
import { Badge, CabinetState, dateLabel, Icon, ProjectLabel, RequestHeader, RequestMessages, Timeline } from "../request-ui";
import { CancelForm } from "./cancel-form";

export default async function RequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  const { id } = await params;
  const request = viewer.role === "student" ? await db.documentRequest.findFirst({ where: { id, ownerId: viewer.id }, include: { ...requestDetails, messages: requestMessages } }) : null;
  if (!request) return (
    <CabinetShell role={viewer.role === "staff" ? "staff" : "student"} active="requests" viewer={viewer} pageTitle="Заявка">
      <main className="request-page account-page">
        <RequestHeader title="Заявка" back={viewer.role === "staff" ? "/staff/requests" : "/requests"} />
        <CabinetState icon="request-file" title="Эта заявка вам недоступна"
          action={<Link href={viewer.role === "staff" ? "/staff/requests" : "/requests"} className="secondary request-button">К заявкам</Link>} />
        <ProjectLabel />
      </main>
    </CabinetShell>
  );

  const { submitted } = await searchParams;
  const ready = request.status === "READY" || request.status === "ISSUED";
  const canCancel = request.status === "NEW" || request.status === "IN_PROGRESS";
  const rejection = request.status === "REJECTED" ? request.events.findLast(event => event.toStatus === "REJECTED")?.reason : null;
  const title = `Заявка № ${requestNumber(request.number)}`;

  return (
    <CabinetShell role="student" active="requests" viewer={viewer} pageTitle={title}>
      <main className="request-page">
        <RequestHeader title={title} subtitle={requestTypes[request.type]} back="/requests" />
        {submitted === "1" && request.status === "NEW" && <CabinetState icon="request-check" tone="success"
          iconEffect={<OnceMotion key={id} name={`request-submitted:${id}`} className="request-sent-sparks" />}
          title="Заявка отправлена" description={`Будет готова ${dateLabel(request.dueOn)}`}
          action={<><Link href="/requests" className="secondary request-button">К заявкам</Link>
            <Link href="/cabinet" className="secondary request-button">На главную</Link></>} />}
        <div className="student-detail-layout">
          <div className="detail-stack">
            <section className="surface request-summary">
              <div className="request-row action-row"><strong>{requestTypes[request.type]}</strong><Badge status={request.status} /></div>
              <div className="muted">
                <p>{request.purpose}</p>
                <p>Экземпляров: {request.copies} · {deliveries[request.delivery]}</p>
                {request.comment && <p>{request.comment}</p>}
              </div>
              {(request.status === "NEW" || request.status === "IN_PROGRESS") && <p className="request-date request-with-icon"><Icon name="request-calendar" monochrome />Будет готова {dateLabel(request.dueOn)}</p>}
            </section>
            {ready && request.document && <section className="surface request-summary">
              <div className="request-file-mark"><Icon name="home-file-check" size={28} monochrome /></div>
              <h2>{requestTypes[request.type]}.pdf</h2>
              <p className="muted">Дата выдачи: {dateLabel(request.document.createdAt)}<br />PDF · {Math.max(1, Math.round(request.document.size / 1024))} КБ · Электронная доставка</p>
              <a className="primary request-button" href={`/api/v1/files/${request.document.id}`}>Скачать</a>
            </section>}
            {ready && request.delivery === "pickup" && <section className="surface request-summary">
              <div className="request-file-mark"><Icon name="schedule-room" size={26} monochrome /></div>
              <h2>Заберите в деканате</h2><p>Кабинет А-101 · Пн–Пт 09:00–18:00</p><p className="muted">Перерыв 13:00–14:00</p>
              <p>Назовите номер заявки № {requestNumber(request.number)}</p>
            </section>}
            {rejection && <section className="surface request-summary">
              <h2>Причина отказа</h2>
              <p className="preserve-lines">{rejection}</p>
            </section>}
          </div>
          <div className="detail-stack">
            <h2 className="request-section-title">Путь вашей заявки</h2>
            <Timeline events={request.events} status={request.status} dueOn={request.dueOn} />
            {request.messages.length > 0 && <RequestMessages messages={request.messages} />}
            {canCancel && <div className="detail-stack">
              {request.delivery === "electronic" && <p className="muted request-hint">Готовый документ появится в заявке. Его можно будет скачать в формате PDF.</p>}
              <CancelForm id={request.id} version={request.version} />
            </div>}
          </div>
        </div>
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
