import { CabinetShell } from "../../cabinet-shell";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getRequestViewer } from "../../../lib/viewer";
import { ProjectLabel } from "../request-ui";
import { NewRequestForm } from "./request-form";

export default async function NewRequest({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "student") redirect("/staff");

  const { mode } = await searchParams;
  return (
    <CabinetShell role="student" active="requests" viewer={viewer} pageTitle="Новая заявка">
      <main className="request-page request-create-page">
        <NewRequestForm submissionKey={randomUUID()} openAssistant={mode === "assistant"} />
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
