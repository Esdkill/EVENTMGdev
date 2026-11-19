import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { studyGroupCodes } from "../../../lib/study-groups";
import { getViewer } from "../../../lib/viewer";
import { CabinetShell } from "../../cabinet-shell";
import { Icon, ProjectLabel, RequestHeader } from "../../requests/request-ui";
import { GroupForm, StudentForm } from "./student-form";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ view?: string; removed?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") redirect("/cabinet");
  const { view, removed } = await searchParams;
  const showGroups = view === "groups";
  const [groups, profiles] = await Promise.all([
    studyGroupCodes(),
    showGroups ? [] : db.studentProfile.findMany({
      select: { userId: true, group: true, year: true, user: { select: { name: true, username: true, isDemo: true, mustChangePassword: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <CabinetShell role="staff" active="students" viewer={viewer}>
      <main className="request-page">
        <RequestHeader title={showGroups ? "Учебные группы" : "Студенты"} staffName={viewer.name} staff />
        <nav className="schedule-view staff-work-tabs" aria-label="Учебные аккаунты">
          <Link href="/staff/students" aria-current={!showGroups ? "page" : undefined}>Студенты</Link>
          <Link href="/staff/students?view=groups" aria-current={showGroups ? "page" : undefined}>Группы</Link>
        </nav>
        {removed === "1" && <p className="request-callout" role="status">Аккаунт студента удалён.</p>}
        {showGroups ? <div className="staff-detail-layout">
          <GroupForm />
          <section className="cabinet-glass request-summary staff-group-list">
            <h2>Зарегистрированные группы</h2>
            {groups.length ? <ul className="account-list">
              {groups.map(code => <li key={code}>
                <Link className="menu-link" href={`/staff/schedule?mode=add&group=${encodeURIComponent(code)}`} aria-label={`Добавить занятие · ${code}`}>
                  <Icon name="schedule-group" size={18} monochrome /><strong className="menu-label">{code}</strong><Icon name="request-chevron" size={14} monochrome />
                </Link>
              </li>)}
            </ul> : <p className="muted">Здесь появятся созданные группы.</p>}
          </section>
        </div> : <div className="staff-detail-layout">
          <div className="detail-stack"><StudentForm groups={groups} /></div>
          <section className="surface request-summary">
            <h2>Учебные аккаунты</h2>
            {profiles.length ? <ul className="account-list">
              {profiles.map(({ userId, user, group, year }) => (
                <li key={userId}>
                  <Link className="menu-link" href={`/staff/students/${userId}`}>
                    <div className="menu-label"><strong>{user.name}</strong><p className="muted">{group} · {year} курс · {user.username}</p>
                      {user.isDemo ? <span className="request-badge">Демо-аккаунт</span>
                        : user.mustChangePassword && <span className="request-badge">Требуется новый пароль</span>}
                    </div>
                    <Icon name="request-chevron" size={14} monochrome />
                  </Link>
                </li>
              ))}
            </ul> : <p className="muted">Учебных аккаунтов пока нет.</p>}
          </section>
        </div>}
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
