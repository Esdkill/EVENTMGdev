import { notFound, redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { gradeLabels } from "../../../lib/grades";
import { getRequestViewer } from "../../../lib/viewer";
import { CabinetShell } from "../../cabinet-shell";
import { ProgressMeter } from "../../progress-meter";
import { dateLabel, Icon, ProjectLabel, RequestHeader } from "../../requests/request-ui";

export default async function GradePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "student") redirect("/staff");
  const { id } = await params;
  const grade = await db.gradeRecord.findFirst({ where: { id, ownerId: viewer.id }, include: { checkpoints: { orderBy: { id: "asc" } } } });
  if (!grade) notFound();
  const points = grade.checkpoints.reduce((total, item) => total + item.points, 0);
  const maximum = grade.checkpoints.reduce((total, item) => total + item.maxPoints, 0);

  return (
    <CabinetShell role="student" active="grades" viewer={viewer}>
      <main className="request-page subject-page">
        <RequestHeader title={grade.subject} subtitle={`Семестр ${grade.semester} · ${grade.kind.toLowerCase()}`} back={`/grades?semester=${grade.semester}`} />
        <div className="student-detail-layout subject-layout">
          <div className="surface grade-hero subject-banner">
            <div><p className="muted">Итог за семестр</p><strong>{maximum ? `${points} / ${maximum}` : grade.score ?? (grade.status === "passed" ? "Зачёт" : "—")}</strong><p>{gradeLabels[grade.status]}</p></div>
            {maximum > 0 && grade.score !== null && <div className="grade-score">{grade.score}</div>}
          </div>
          <section className="surface request-with-icon subject-teacher"><Icon name="subject-teacher" size={20} monochrome /><div><strong>{grade.teacher}</strong><p className="muted">Преподаватель</p></div></section>
          <section className="detail-stack subject-points">
            <h2>Из чего сложилась оценка</h2>
            <div className="surface request-summary">
              {grade.checkpoints.length ? grade.checkpoints.map(item => <div key={item.id}>
                <div className="request-row"><span>{item.title}</span><strong>{item.points} / {item.maxPoints}</strong></div>
                <ProgressMeter label={item.title} value={item.points} max={item.maxPoints} />
              </div>) : <p className="muted">Контрольные точки пока недоступны.</p>}
            </div>
          </section>
          {maximum > 0 && grade.status === "passed" && <aside className="surface request-with-icon subject-note"><Icon name="subject-info" monochrome /><p className="muted">Ваш результат сохранён в зачётной книжке.</p></aside>}
          {grade.attendance !== null && <section className="surface subject-attendance"><h2>Посещаемость · {grade.attendance}%</h2></section>}
          {grade.nextAt && <section className="surface request-summary subject-next"><h2>Следующий контроль</h2><p>{dateLabel(grade.nextAt, true)}</p></section>}
        </div>
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
