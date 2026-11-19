import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { demoPasswordRestriction } from "../../../../lib/demo";
import { getRequestViewer } from "../../../../lib/viewer";
import { CabinetShell } from "../../../cabinet-shell";
import { ProjectLabel, RequestHeader } from "../../../requests/request-ui";
import { StudentDocumentsForm } from "./student-documents-form";
import { AccessForm } from "./access-form";
import { DeleteStudentForm } from "./delete-student-form";

export default async function StudentAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") redirect("/cabinet");

  const { id } = await params;
  const student = await db.studentProfile.findUnique({
    where: { userId: id },
    select: {
      group: true, year: true, faculty: true, program: true, studentNumber: true, recordBookNumber: true,
      user: { select: { role: true, name: true, username: true, isDemo: true, mustChangePassword: true, temporaryPasswordExpiresAt: true } },
    },
  });
  if (!student || student.user.role !== "student") notFound();

  const { user } = student;
  const demo = user.isDemo;
  const credential = await db.account.findFirst({
    where: { userId: id, providerId: "credential", password: { not: null } },
    select: { id: true },
  });
  const expired = user.temporaryPasswordExpiresAt && user.temporaryPasswordExpiresAt.getTime() <= Date.now();
  const status = !credential ? "Пароль отозван" : expired ? "Временный пароль истёк"
    : user.mustChangePassword ? "Ожидает смены пароля" : "Доступ активен";

  return <CabinetShell role="staff" active="students" viewer={viewer} pageTitle="Доступ студента">
    <main className="request-page">
      <RequestHeader title="Доступ студента" back="/staff/students" staff end={null} />
      <div className="staff-detail-layout">
        <section className="surface request-summary">
          <h2>{user.name}</h2>
          <p>{student.group} · {student.year} курс</p>
          <p className="muted">{student.faculty} · {student.program}</p>
          <StudentDocumentsForm studentId={id} numbers={{
            studentNumber: student.studentNumber,
            recordBookNumber: student.recordBookNumber,
          }} />
        </section>
        <section className="surface request-summary">
          <div className="request-row action-row"><h2>Вход в кабинет</h2>
            {demo && <span className="request-badge">Демо-аккаунт</span>}
          </div>
          <p className="staff-student-account-id">ID аккаунта · <code>{id}</code></p>
          {user.username && <p>Логин · <strong>{user.username}</strong></p>}
          {demo ? <p className="muted">{demoPasswordRestriction}</p> : <>
            <p>{status}</p>
            {user.username && <AccessForm studentId={id} hasPassword={Boolean(credential)} />}
          </>}
          <DeleteStudentForm studentId={id} name={user.name} />
        </section>
      </div>
      <Link className="text-action request-with-icon" href="/staff/students">К списку студентов</Link>
      <ProjectLabel />
    </main>
  </CabinetShell>;
}
