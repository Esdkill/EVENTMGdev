import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { threadNumber, topicLabel } from "../../lib/messages";
import { getRequestViewer } from "../../lib/viewer";
import { CabinetShell } from "../cabinet-shell";
import { dateLabel, CabinetState, Icon, ProjectLabel, RequestHeader } from "../requests/request-ui";

export default async function MessagesPage() {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  const staff = viewer.role === "staff";
  if (!staff && viewer.role !== "student") redirect("/");
  const threads = await db.deanThread.findMany({
    where: staff ? {} : { ownerId: viewer.id },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    include: {
      owner: { select: { name: true, studentProfile: { select: { group: true } } } },
      messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { text: true, authorId: true, createdAt: true } },
    },
  });
  const unread = threads.filter(thread => thread.messages[0]?.authorId === thread.ownerId && (!thread.staffReadAt || thread.messages[0].createdAt > thread.staffReadAt));

  return (
    <CabinetShell role={staff ? "staff" : "student"} active="messages" viewer={viewer}>
      <main className="request-page">
        <RequestHeader title={staff ? "Сообщения" : "Обращения"} subtitle={staff ? undefined : "Ответы учебного деканата"} staffName={staff ? viewer.name : undefined} staff={staff} />
        {!staff && !!threads.length && <Link className="primary request-button request-list-action" href="/messages/new">Новое обращение</Link>}
        <div className={staff ? "staff-detail-layout" : "detail-stack"}>
          <ul className="request-list">
            {threads.map(thread => {
              const last = thread.messages[0];
              const isUnread = staff && unread.includes(thread);
              const replied = last && last.authorId !== thread.ownerId;
              return <li key={thread.id}>
                <Link className="surface request-card inbox-row" href={`/messages/${thread.id}`}>
                  <Icon name="staff-messages" size={20} monochrome />
                  <div className="inbox-copy">
                    <strong>{staff ? thread.owner.name : topicLabel(thread.topic)}</strong>
                    {staff ? <p className="muted inbox-excerpt">
                      {isUnread && <span className="inbox-unread-dot" aria-hidden="true" />}
                      {[isUnread ? "Не прочитано" : "Прочитано", thread.owner.studentProfile?.group, topicLabel(thread.topic), last?.text].filter(Boolean).join(" · ")}
                    </p> : <>
                      <p className="muted inbox-excerpt">{last?.text}</p>
                      <p className="muted">№ {threadNumber(thread.number)} · {dateLabel(thread.updatedAt, false, false)}</p>
                      <span className={`request-badge${replied ? " status-ready" : ""}`}>{replied ? "Ответ получен" : "Отправлено"}</span>
                    </>}
                  </div>
                  <Icon name="request-chevron" size={14} monochrome />
                </Link>
              </li>;
            })}
            {!threads.length && <li><CabinetState icon="staff-messages" title={staff ? "Пока нет сообщений" : "Пока нет обращений"}
              description={staff ? "Входящие обращения студентов будут здесь." : "Напишите в деканат, если нужно уточнить учебный вопрос."}
              action={!staff && <Link className="primary request-button" href="/messages/new">Новое обращение</Link>} /></li>}
          </ul>
          {staff && <section className="surface request-summary inbox-overview"><h2>Входящие</h2><p className="muted">Непрочитанных: {unread.length} · отвечаем в течение рабочего дня</p></section>}
        </div>
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
