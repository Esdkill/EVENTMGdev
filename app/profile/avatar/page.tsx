import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { avatarUploadLimit } from "../../../lib/stock-avatars";
import { avatarSource, avatarUploadOrder } from "../../../lib/user-avatar";
import { getRequestViewer } from "../../../lib/viewer";
import { CabinetShell } from "../../cabinet-shell";
import { Initials, ProjectLabel, RequestHeader } from "../../requests/request-ui";
import { AvatarForm } from "./avatar-form";
import "../../account-information.css";
import "./avatar.css";

export default async function AvatarPage({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  const [query, uploads] = await Promise.all([
    searchParams,
    db.userAvatarUpload.findMany({ where: { userId: viewer.id }, orderBy: avatarUploadOrder, take: avatarUploadLimit, select: { id: true } }),
  ]);
  const chosen = viewer.avatar?.presetId ? `preset:${viewer.avatar.presetId}`
    : viewer.avatar?.uploadId ? `upload:${viewer.avatar.uploadId}` : "";
  const staff = viewer.role === "staff";
  return <CabinetShell role={staff ? "staff" : "student"} active="profile" viewer={viewer} pageTitle="Аватарка">
    <main className="request-page">
      <RequestHeader title="Аватарка" back="/profile" end={null} />
      <section className="surface profile-identity">
        <Initials name={viewer.name} stored={viewer.studentProfile} src={avatarSource(viewer.avatar)} />
        <strong>{viewer.name}</strong>
      </section>
      {query.updated && <p className="request-callout" role="status">{query.updated === "removed" ? "Аватарка убрана из профиля." : "Аватарка сохранена."}</p>}
      <AvatarForm key={viewer.avatar?.updatedAt.toISOString() ?? "no-avatar"} chosen={chosen} uploads={uploads} />
      <ProjectLabel />
    </main>
  </CabinetShell>;
}
