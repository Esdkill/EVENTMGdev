import Link from "next/link";
import { redirect } from "next/navigation";
import { avatarSource } from "../../lib/user-avatar";
import { db } from "../../lib/db";
import { getRequestViewer } from "../../lib/viewer";
import { ConfirmSignOut } from "../confirm-signout";
import { CabinetShell } from "../cabinet-shell";
import { Icon, Initials, ProjectLabel, RequestHeader } from "../requests/request-ui";
import { LoginCopy } from "./login-copy";
import "../account-information.css";

export default async function ProfilePage() {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  const staff = viewer.role === "staff";
  const profile = viewer.studentProfile;
  if (!staff && !profile) redirect("/cabinet");
  const demo = viewer.isDemo;
  const documentNumbers = !staff && profile ? await db.studentProfile.findUnique({
    where: { userId: viewer.id }, select: { studentNumber: true, recordBookNumber: true },
  }) : null;
  const { studentNumber, recordBookNumber } = documentNumbers ?? {};

  return (
    <CabinetShell role={staff ? "staff" : "student"} active="profile" viewer={viewer} pageTitle="Профиль">
      <main className="request-page profile-page">
        <RequestHeader title="Профиль" end={null} />
        <section className="surface profile-identity">
          <Initials name={viewer.name} stored={profile} src={avatarSource(viewer.avatar)} />
          <div>
            <h2>{viewer.name}</h2>
            {staff ? <p className="muted">Специалист деканата</p>
              : profile && <p className="muted">{profile.group} · {profile.year} курс</p>}
            <Link className="text-action" href="/profile/avatar">Изменить аватарку</Link>
          </div>
        </section>

        {staff ? <section className="surface profile-panel" aria-labelledby="profile-account">
          <h2 id="profile-account">Аккаунт</h2>
          {viewer.username && <LoginCopy username={viewer.username} demo={false} />}
        </section> : profile && <div className="profile-layout">
          <Link className="profile-report" href="/messages/new?topic=profile">Сообщить об ошибке</Link>
          <section className="surface profile-panel profile-academic" aria-labelledby="profile-academic">
            <h2 id="profile-academic">Учебные данные</h2>
            <dl className="profile-fields">
              <div><dt>Факультет</dt><dd>{profile.faculty}</dd></div>
              <div><dt>Направление</dt><dd>{profile.program}</dd></div>
              <div><dt>Номер студенческого билета</dt><dd>{studentNumber ? `•••• ${studentNumber.slice(-2)}` : "Пока не указан"}</dd></div>
              <div><dt>Номер зачётной книжки</dt><dd>{recordBookNumber ?? "Пока не указан"}</dd></div>
            </dl>
          </section>
          <section className="surface profile-panel profile-security" aria-labelledby="profile-account">
            <h2 id="profile-account">Аккаунт</h2>
            {viewer.username && <LoginCopy username={viewer.username} demo={demo} />}
          </section>
        </div>}
        <ConfirmSignOut className="profile-exit profile-action profile-signout">
            <Icon name="account-logout" size={18} monochrome /><span>Выйти</span>
        </ConfirmSignOut>
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
