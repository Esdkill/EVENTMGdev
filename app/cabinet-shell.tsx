import { Suspense } from "react";
import { RememberCabinetPage } from "./offline-cabinet";
import { CabinetLink } from "./cabinet-link";
import { avatarSource } from "../lib/user-avatar";
import { db } from "../lib/db";
import { enabledBulletins } from "../lib/notifications";
import { nameParts, type StoredName } from "../lib/person-name";
import { CabinetAccount } from "./cabinet-account";
import { DeaneryChat } from "./deanery-chat";
import { CabinetDate } from "./cabinet-date";
import { PixelRobot } from "./cabinet/pixel-robot";
import { Icon } from "./requests/request-ui";

const studentItems = [
  { id: "home", href: "/cabinet", label: "Главная", icon: "nav-home" },
  { id: "schedule", href: "/schedule", label: "Расписание", icon: "schedule-calendar" },
  { id: "grades", href: "/grades", label: "Оценки", desktopLabel: "Оценки и сессия", icon: "nav-grades" },
  { id: "requests", href: "/requests", label: "Заявки", desktopLabel: "Заявки и справки", icon: "nav-requests" },
  { id: "notifications", href: "/notifications", label: "Уведомления", icon: "home-bell", desktopOnly: true },
  { id: "more", href: "/more", label: "Ещё", icon: "nav-more", mobileOnly: true },
] as const;

const staffItems = [
  { id: "home", href: "/staff", label: "Главная", icon: "nav-home" },
  { id: "requests", href: "/staff/requests", label: "Заявки", icon: "nav-requests" },
  { id: "announcements", href: "/staff/announcements", label: "Объявления", icon: "staff-announcements" },
  { id: "banners", href: "/staff/banners", label: "Баннеры", icon: "home-file-plus", desktopOnly: true },
  { id: "schedule", href: "/staff/schedule", label: "Расписание", icon: "schedule-change", desktopOnly: true },
  { id: "messages", href: "/messages", label: "Сообщения", icon: "staff-messages" },
  { id: "students", href: "/staff/students", label: "Студенты", icon: "user", desktopOnly: true },
  { id: "notifications", href: "/notifications", label: "Уведомления", icon: "home-bell", desktopOnly: true },
  { id: "assistant", href: "/staff/assistant", label: "ИИ-помощник", icon: "assistant-robot", desktopOnly: true },
  { id: "more", href: "/more", label: "Ещё", icon: "nav-more", mobileOnly: true },
] as const;

type Section = typeof studentItems[number]["id"] | typeof staffItems[number]["id"] | "messages" | "profile";
type CabinetViewer = {
  id: string;
  name: string;
  isDemo: boolean;
  avatar?: { updatedAt: Date } | null;
  studentProfile: ({ faculty: string; group: string; year: number } & StoredName) | null;
};

export function CabinetNotificationsLink({ unread = 0, important = false }: { unread?: number; important?: boolean }) {
  return <CabinetLink href="/notifications" className={`icon-button cabinet-notifications${important ? " cabinet-notifications-important" : ""}`}
    aria-label={important ? `Уведомления, есть важные новости, непрочитанных: ${unread}` : unread ? `Уведомления, непрочитанных: ${unread}` : "Уведомления"}>
    <Icon name="home-bell" size={19} monochrome />
    {unread > 0 && <span className="cabinet-unread-dot" aria-hidden="true" />}
  </CabinetLink>;
}

export async function CabinetShell({ role, active, viewer, pageTitle, unread, importantUnread, children }: {
  role: "student" | "staff";
  active: Section;
  viewer: CabinetViewer;
  pageTitle?: string;
  unread?: number;
  importantUnread?: boolean;
  children: React.ReactNode;
}) {
  const staff = role === "staff";
  const items = staff ? staffItems : studentItems;
  const home = staff ? "/staff" : "/cabinet";
  const item = items.find(item => item.id === active);
  const section = pageTitle ?? (item && "desktopLabel" in item ? item.desktopLabel : item?.label) ?? "Обращения";
  const group = viewer.studentProfile;
  const identity = staff ? "Специалист деканата" : group ? `${group.group} · ${group.year} курс` : null;
  const mobileActive = !item || "desktopOnly" in item ? "more" : active;
  const unreadWhere = unread === undefined || importantUnread === undefined
    ? { ...await enabledBulletins({ ...viewer, role }), reads: { none: { userId: viewer.id } } }
    : undefined;
  const [count, important] = await Promise.all([
    unread ?? db.bulletin.count({ where: unreadWhere }),
    importantUnread ?? (unreadWhere?.kind.in.includes("news")
      ? db.bulletin.count({ where: { ...unreadWhere, kind: "news", important: true } }).then(total => total > 0)
      : false),
  ]);
  const names = nameParts(viewer.name, group);

  return (
    <div className={`cabinet-shell ${staff ? "staff-cabinet" : "student-cabinet"}`}>
      <aside className="cabinet-navigation">
        <CabinetLink href={home} className="cabinet-brand">
          <Icon name="deanery" size={40} monochrome />
          <span>Цифровой<br />деканат</span>
        </CabinetLink>
        <nav className="request-nav" aria-label={staff ? "Кабинет деканата" : "Кабинет студента"}>
          {items.map(item => (
            <CabinetLink key={item.id} href={item.href}
              className={"desktopOnly" in item ? "nav-desktop" : "mobileOnly" in item ? "nav-mobile" : undefined}
              aria-current={item.id === active || item.id === mobileActive ? "page" : undefined}>
              <Icon name={item.icon} size={20} monochrome />
              {"desktopLabel" in item
                ? <><span className="nav-label-mobile">{item.label}</span><span className="nav-label-desktop">{item.desktopLabel}</span></>
                : <span>{item.label}</span>}
              {item.id === "notifications" && count > 0 && <span className="cabinet-unread-count" aria-label={`Непрочитанных: ${count}`}>{count}</span>}
            </CabinetLink>
          ))}
        </nav>
        <div className="cabinet-sidebar-bottom">
          <CabinetLink className="cabinet-sidebar-help" href="/help">
            <Icon name="staff-messages" size={20} monochrome />
            <h2>Нужна помощь?</h2>
            <p className="muted">Контакты деканата и ответы на частые вопросы.</p>
            <span className="cabinet-help-link">Помощь и контакты <Icon name="request-chevron" size={12} monochrome /></span>
          </CabinetLink>
          <CabinetAccount name={viewer.name} storedName={names} identity={identity} avatar={avatarSource(viewer.avatar)} staff={staff} moreActive={active === "more" && !pageTitle} />
        </div>
      </aside>
      <div className="cabinet-body">
        <div className="cabinet-topbar">
          <CabinetLink href={home}>{staff ? "Кабинет сотрудника" : "Кабинет студента"}</CabinetLink>
          <span aria-hidden="true">›</span><span className="cabinet-crumb">{section}</span>
          <div className="cabinet-topbar-actions">
            <CabinetDate initialTime={Date.now()} />
            <CabinetNotificationsLink unread={count} important={important} />
          </div>
        </div>
        {children}
        <Suspense><RememberCabinetPage userId={viewer.id} /></Suspense>
        {!staff && <div className="pixel-robot-track"><PixelRobot /></div>}
        <div id="cabinet-loading-slot" />
      </div>
      <DeaneryChat userId={viewer.id} staff={staff} />
    </div>
  );
}
