import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { threadNumber, topicLabel } from "../../../lib/messages";
import { getRequestViewer } from "../../../lib/viewer";
import { CabinetShell } from "../../cabinet-shell";
import { dateLabel, Icon, ProjectLabel, RequestHeader } from "../../requests/request-ui";
import { markThreadRead } from "../actions";
import { MessageComposer } from "../message-form";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  const staff = viewer.role === "staff";
  if (!staff && viewer.role !== "student") redirect("/");
  const { id } = await params;
  const thread = await db.deanThread.findFirst({
    where: { id, ...(staff ? {} : { ownerId: viewer.id }) },
    include: {
      owner: { select: { name: true, studentProfile: { select: { group: true } } } },
      messages: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { author: { select: { name: true } }, attachment: { select: { name: true } } },
      },
    },
  });
  if (!thread) notFound();
  const last = thread.messages.at(-1);
  const unread = last?.authorId === thread.ownerId && (!thread.staffReadAt || last.createdAt > thread.staffReadAt);
  const title = `Обращение № ${threadNumber(thread.number)}`;
  const replied = last && last.authorId !== thread.ownerId;

  return (
    <CabinetShell role={staff ? "staff" : "student"} active="messages" viewer={viewer} pageTitle={staff ? "Сообщения" : title}>
      <main className="request-page">
        <RequestHeader title={staff ? "Сообщения" : title} subtitle={staff ? undefined : "Цифровой деканат"}
          staffName={staff ? viewer.name : undefined} back="/messages" staff={staff} />
        <div className="thread-layout">
          <div className="thread-meta detail-stack">
            {staff && <p className="muted">{title}</p>}
            <p className="muted">Тема · {topicLabel(thread.topic)}</p>
            <div><span className={`request-badge${replied ? " status-ready" : ""}`}>{replied ? "Ответ получен" : "Отправлено"}</span></div>
            {staff && unread && <form action={markThreadRead.bind(null, id)}><button className="secondary">Отметить прочитанным</button></form>}
          </div>
          <div className="detail-stack thread-messages">
            <ul className="request-list conversation" aria-label="Переписка">
              {thread.messages.map(message => {
                const own = message.authorId === viewer.id;
                const fromStudent = message.authorId === thread.ownerId;
                const author = own ? "Вы" : fromStudent
                  ? [message.author.name, thread.owner.studentProfile?.group].filter(Boolean).join(" · ")
                  : `${message.author.name} · Деканат`;
                return <li className="surface request-summary" key={message.id}>
                  <strong>{author}</strong>
                  <time className="muted" dateTime={message.createdAt.toISOString()}>{dateLabel(message.createdAt, true, false)}</time>
                  <p className="preserve-lines">{message.text}</p>
                  {message.attachment && <a className="menu-link" href={`/api/v1/messages/attachments/${message.id}`}>
                    <Icon name="request-file" size={20} monochrome /><span className="menu-label">{message.attachment.name}</span><Icon name="request-chevron" size={14} monochrome />
                  </a>}
                </li>;
              })}
            </ul>
            <MessageComposer key={last?.id ?? id} id={id} submissionKey={randomUUID()} staff={staff} />
          </div>
        </div>
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
