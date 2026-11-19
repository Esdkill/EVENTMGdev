import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { gradeLabels, gradeSummary } from "../../lib/grades";
import { getRequestViewer } from "../../lib/viewer";
import { CabinetShell } from "../cabinet-shell";
import { dateLabel, CabinetState, Icon, ProjectLabel, RequestHeader } from "../requests/request-ui";

export default async function GradesPage({ searchParams }: { searchParams: Promise<{ semester?: string }> }) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "student") redirect("/staff");
  const { semester: choice } = await searchParams;
  const terms = await db.gradeRecord.findMany({ where: { ownerId: viewer.id }, distinct: ["semester"], orderBy: { semester: "desc" }, select: { semester: true } });
  const current = terms[0]?.semester;
  const semester = terms.find(term => String(term.semester) === choice)?.semester ?? current;
  const records = semester === undefined ? [] : await db.gradeRecord.findMany({ where: { ownerId: viewer.id, semester }, orderBy: { id: "asc" } });
  const summary = gradeSummary(records);
  const upcoming = records
    .filter(record => record.nextAt && record.status !== "passed")
    .sort((left, right) => left.nextAt!.getTime() - right.nextAt!.getTime());
  const shortDate = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "Europe/Moscow" });

  return (
    <CabinetShell role="student" active="grades" viewer={viewer}>
      <main className="request-page grades-page">
        <RequestHeader title="Оценки и сессия" subtitle={semester ? `${viewer.studentProfile?.year ?? "—"} курс · семестр ${semester}` : undefined} end={<Link className="icon-button request-help" href="/help" aria-label="Помощь по оценкам"><Icon name="grades-info" size={19} monochrome /></Link>} />
        {!!terms.length && <nav className="schedule-view grade-terms" aria-label="Семестр">
          <Link href="/grades" aria-current={semester === current ? "page" : undefined}>Текущий семестр</Link>
          {terms.slice(1).map(term => <Link key={term.semester} href={`/grades?semester=${term.semester}`} aria-current={semester === term.semester ? "page" : undefined}>{terms.length === 2 ? "Предыдущие" : `Семестр ${term.semester}`}</Link>)}
        </nav>}
        {records.length ? <div className="detail-stack grade-overview">
          <div className="detail-stack">
            <div className="surface grade-hero grade-banner">
              <div>
                <p className="muted">Средний балл</p><strong>{summary.average}</strong>
                {summary.passed === summary.total ? <p>Семестр завершён</p> :
                  records.some(record => record.status === "retake") && <p className="grade-retake">Есть пересдача</p>}
              </div>
              <div className="grade-ring" style={{ "--progress": `${summary.passed / summary.total * 100}%` } as React.CSSProperties}><span>Сдано<br />{summary.passed} из {summary.total}</span></div>
            </div>
            {!!upcoming.length && <section className="surface grade-upcoming"><h2>Ближайшие экзамены</h2><ul>{upcoming.map(record => <li className="muted" key={record.id}>{shortDate.format(record.nextAt!)} · {record.subject}</li>)}</ul></section>}
          </div>
          <ul className="grade-list">{records.map(record => <li key={record.id}>
            <Link className="grade-row" href={`/grades/${record.id}`}>
              <div className="grade-cell"><strong>{record.subject}</strong><span className="muted">{record.kind}{record.nextAt && record.status !== "passed" ? ` · ${dateLabel(record.nextAt, false, false)}` : ""}</span></div>
              <div className={`grade-cell grade-result grade-${record.status}`}><strong>{record.score ?? (record.status === "passed" && record.kind === "Зачёт" ? "Зачёт" : "—")}</strong><span>{record.status === "planned" ? "Ожидается" : gradeLabels[record.status]}</span></div>
              <Icon name="grades-chevron" size={12} monochrome />
            </Link>
          </li>)}</ul>
        </div> : <CabinetState icon="nav-grades" title="Оценок пока нет" description="Опубликованные результаты появятся здесь."
          action={<Link className="secondary request-button" href="/schedule">Открыть расписание</Link>} />}
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
