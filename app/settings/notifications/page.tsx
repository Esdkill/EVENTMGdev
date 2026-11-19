import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { getRequestViewer } from "../../../lib/viewer";
import { CabinetShell } from "../../cabinet-shell";
import { ProjectLabel, RequestHeader } from "../../requests/request-ui";
import { PreferencesForm } from "./preferences-form";

export default async function NotificationSettings() {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "student") redirect("/staff");
  const settings = await db.notificationPreferences.findUnique({
    where: { userId: viewer.id }, select: { deadlines: true, schedule: true, requests: true, news: true },
  });
  return (
    <CabinetShell role="student" active="notifications" viewer={viewer} pageTitle="Настройки уведомлений">
      <main className="request-page account-page">
        <RequestHeader title="Настройки уведомлений" back="/notifications" />
        <PreferencesForm settings={settings} />
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
