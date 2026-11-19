import { redirect } from "next/navigation";
import { assistantSettingsId } from "../../../lib/assistant-connection";
import { getAssistantProvider } from "../../../lib/assistant-api-settings";
import { defaultAssistantBehavior, defaultAssistantTone } from "../../../lib/assistant-conversation";
import { db } from "../../../lib/db";
import { getRequestViewer } from "../../../lib/viewer";
import { CabinetShell } from "../../cabinet-shell";
import { ProjectLabel, RequestHeader } from "../../requests/request-ui";
import { removeKnowledgeItem } from "./actions";
import { AssistantApiPanel, AssistantConversationForm, AssistantKnowledgeForm } from "./forms";

export default async function AssistantSettings({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") redirect("/cabinet");
  const [connection, documents, entries, query] = await Promise.all([
    db.assistantSettings.findUnique({
      where: { id: assistantSettingsId },
      select: { model: true, encryptedKey: true, provider: true, apiUrl: true, tone: true, behavior: true, updatedAt: true },
    }),
    db.assistantDocument.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.assistantSource.findMany({
      where: { documentId: null },
      select: { id: true, title: true, section: true, url: true },
      orderBy: { title: "asc" },
    }),
    searchParams,
  ]);
  const savedConnection = connection?.encryptedKey ? {
    apiUrl: connection.apiUrl,
    provider: getAssistantProvider(connection.provider, connection.apiUrl),
    model: connection.model,
    revision: connection.updatedAt.toISOString(),
  } : null;

  return <CabinetShell role="staff" viewer={viewer} active="assistant">
    <main className="request-page assistant-settings-page">
      <RequestHeader title="ИИ-помощник" back="/more" />
      {query.updated === "connection" && <p className="request-callout" role="status">Настройки подключения сохранены.</p>}
      {query.updated === "disconnected" && <p className="request-callout" role="status">Подключение удалено.</p>}
      {query.updated === "conversation" && <p className="request-callout" role="status">Стиль ответов сохранён для всех пользователей.</p>}
      {query.updated === "document" && <p className="request-callout" role="status">Документ доступен помощнику.</p>}
      <div className="assistant-settings-grid">
        <div className="detail-stack">
          <section className="surface request-summary">
            <h2>Подключение к API</h2>
            <p className="muted">{savedConnection ? "Подключение для чата и черновиков используется всеми пользователями." : "Выберите поставщика для чата и черновиков заявок."}</p>
            <AssistantApiPanel key={savedConnection?.revision ?? "disconnected"} connection={savedConnection} />
          </section>
          <section className="surface request-summary">
            <h2>Характер и поведение</h2>
            <p className="muted">Стиль применяется к новым ответам в чате у студентов и сотрудников.</p>
            <AssistantConversationForm key={`${connection?.tone}:${connection?.behavior}`} tone={connection?.tone ?? defaultAssistantTone} behavior={connection?.behavior ?? defaultAssistantBehavior} />
          </section>
        </div>
        <section className="surface request-summary">
          <h2>База знаний</h2>
          <p className="muted">Загрузите документы вуза, доступные всем пользователям кабинета. Помощник найдёт нужный фрагмент и приложит ссылку. Текст со сканов PDF и фотографий распознаётся при загрузке.</p>
          <AssistantKnowledgeForm key={documents.length} />
          {documents.length + entries.length > 0 ? <ul className="assistant-knowledge-list" aria-label="Документы базы знаний">
            {documents.map(document => <li key={document.id}>
              <a href={`/api/v1/assistant/documents/${document.id}`} target="_blank" rel="noopener noreferrer">{document.name}</a>
              <form action={removeKnowledgeItem}>
                <input type="hidden" name="id" value={document.id} />
                <input type="hidden" name="kind" value="document" />
                <button className="text-action danger-text" aria-label={`Удалить ${document.name}`}>Удалить</button>
              </form>
            </li>)}
            {entries.map(entry => <li key={entry.id}>
              <a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.title} · {entry.section}</a>
              <form action={removeKnowledgeItem}>
                <input type="hidden" name="id" value={entry.id} />
                <input type="hidden" name="kind" value="source" />
                <button className="text-action danger-text" aria-label={`Удалить ${entry.title} · ${entry.section}`}>Удалить</button>
              </form>
            </li>)}
          </ul> : <p className="muted">В базе знаний пока нет документов.</p>}
        </section>
      </div>
      <ProjectLabel />
    </main>
  </CabinetShell>;
}
