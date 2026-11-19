import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getRequestViewer } from "../../../lib/viewer";
import { CabinetNotificationsLink, CabinetShell } from "../../cabinet-shell";
import { ProjectLabel, RequestHeader } from "../../requests/request-ui";
import { MessageComposer } from "../message-form";

export default async function NewMessage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "student") redirect("/messages");
  const title = "Новое обращение";
  const topic = (await searchParams).topic;
  return (
    <CabinetShell role="student" active="messages" viewer={viewer} pageTitle={title}>
      <main className="request-page account-page contact-page">
        <RequestHeader title={title} subtitle="Цифровой деканат" end={<CabinetNotificationsLink />} />
        <p className="muted contact-response-time">Обычно отвечаем за 1 рабочий день</p>
        <MessageComposer id={null} submissionKey={randomUUID()} initialTopic={topic === "profile" ? "profile" : ""} />
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
