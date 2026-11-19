import { redirect } from "next/navigation";
import { getRequestViewer } from "../../../lib/viewer";
import { CabinetNotificationsLink, CabinetShell } from "../../cabinet-shell";
import { ProjectLabel, RequestHeader } from "../../requests/request-ui";
import { ThemeOptions } from "../theme-options";

export default async function ThemePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  const staff = viewer.role === "staff";
  const fromProfile = !staff && (await searchParams).from === "profile";
  return (
    <CabinetShell role={staff ? "staff" : "student"} active="more" viewer={viewer} pageTitle="Тема оформления">
      <main className="request-page account-page">
        <RequestHeader title="Тема" subtitle="Цифровой деканат" back={fromProfile ? "/profile" : undefined}
          staff={staff} end={staff ? undefined : <CabinetNotificationsLink />} />
        <ThemeOptions />
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
