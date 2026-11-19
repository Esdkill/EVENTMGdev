import Link from "next/link";
import { redirect } from "next/navigation";
import { avatarSource } from "../../lib/user-avatar";
import { getRequestViewer } from "../../lib/viewer";
import { MobileAccountSettings } from "../account-settings";
import { ConfirmSignOut } from "../confirm-signout";
import { CabinetNotificationsLink, CabinetShell } from "../cabinet-shell";
import { Icon, Initials, ProjectLabel, RequestHeader } from "../requests/request-ui";

export default async function MorePage() {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  const staff = viewer.role === "staff";
  const profile = viewer.studentProfile;
  const links: [label: string, href: string, icon: string, mobileOnly: boolean][] = staff ? [
    ["Баннеры", "/staff/banners", "home-file-plus", true],
    ["Студенты", "/staff/students", "user", true],
    ["Расписание", "/staff/schedule", "schedule-change", true],
    ["Сообщения", "/messages", "staff-messages", true],
    ["ИИ-помощник", "/staff/assistant", "assistant-robot", true],
  ] : [
    ["Обращения", "/messages", "staff-messages", false],
  ];
  links.push(
    ["Уведомления", "/notifications", "home-bell", true],
    ["Помощь и контакты деканата", "/help", "menu-help", true],
    ["О проекте", "/about", "about-info", false],
  );
  const account = <>
    <Initials name={viewer.name} stored={profile} src={avatarSource(viewer.avatar)} />
    <div className="menu-account-copy"><strong>{viewer.name}</strong>
      {staff ? <p className="muted">Специалист деканата</p> : profile && <p className="muted">{profile.group} · {profile.year} курс</p>}
    </div>
  </>;

  return (
    <CabinetShell role={staff ? "staff" : "student"} active="more" viewer={viewer}>
      <main className="request-page account-page">
        <RequestHeader title="Ещё" subtitle="Цифровой деканат" staff={staff} end={staff ? undefined : <div className="more-mobile-only"><CabinetNotificationsLink /></div>} />
        <Link className="surface request-card menu-account" href="/profile">{account}<Icon name="request-chevron" size={16} monochrome /></Link>
        <div className="surface menu-list">
          <MobileAccountSettings staff={staff} />
          {links.map(([label, href, icon, mobileOnly]) => <Link key={href} className={mobileOnly ? "menu-link more-mobile-only" : "menu-link"} href={href}>
            <Icon name={icon} size={20} monochrome /><span className="menu-label">{label}</span><Icon name="request-chevron" size={14} monochrome />
          </Link>)}
          <ConfirmSignOut className="menu-link more-mobile-only">
            <Icon name="account-logout" size={20} monochrome /><span className="menu-label">Выйти</span><Icon name="request-chevron" size={14} monochrome />
          </ConfirmSignOut>
        </div>
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
