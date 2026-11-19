import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { announcementCohorts, announcementRoles } from "../../../lib/announcement-audience";
import { db } from "../../../lib/db";
import { getViewer } from "../../../lib/viewer";
import { CabinetShell } from "../../cabinet-shell";
import { dateLabel, ProjectLabel, RequestHeader } from "../../requests/request-ui";
import { AnnouncementForm } from "./announcement-form";
import type { AnnouncementInitial } from "./announcement-form";
import { hideAnnouncement } from "./actions";

export default async function Announcements({ searchParams }: {
  searchParams: Promise<{ published?: string; hidden?: string; stale?: string; edit?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") redirect("/cabinet");
  const { published, hidden, stale, edit } = await searchParams;
  const [profiles, items, editing] = await Promise.all([
    db.studentProfile.findMany({ select: { group: true, faculty: true, year: true } }),
    db.bulletin.findMany({ where: { kind: "news" }, orderBy: [{ publishAt: "desc" }, { id: "desc" }] }),
    edit && z.uuid().safeParse(edit).success
      ? db.bulletin.findFirst({ where: { id: edit, kind: "news" }, include: { attachment: { select: { name: true } } } })
      : null,
  ]);
  const formId = editing?.id ?? randomUUID();
  const now = new Date();
  const initial: AnnouncementInitial | undefined = editing ? {
    version: editing.version, title: editing.title, text: editing.text, cohort: editing.cohort ?? "demo",
    role: editing.audience === "everyone" || editing.audience === "staff" ? editing.audience : "all",
    segment: editing.audience === "group" || editing.audience === "year" || editing.audience === "faculty" ? editing.audience : "all",
    target: editing.target ?? "",
    date: editing.publication === "published" || editing.publishAt > now
      ? new Date(editing.publishAt.getTime() + 10800000).toISOString().slice(0, 16) : "",
    important: editing.important, attachment: editing.attachment?.name ?? "",
    publication: editing.publication,
  } : undefined;

  return (
    <CabinetShell role="staff" active="announcements" viewer={viewer}>
      <main className="request-page">
        <RequestHeader title="Объявления" staffName={viewer.name} staff />
        {published === "1" && <p className="request-callout" role="status">Объявление сохранено</p>}
        {hidden === "1" && <p className="request-callout" role="status">Объявление скрыто</p>}
        {(stale === "1" || (edit && !editing)) && <p className="form-error" role="alert">Объявление уже изменилось или недоступно.</p>}
        {editing && <Link className="text-action" href="/staff/announcements">Вернуться к новому объявлению</Link>}
        <AnnouncementForm key={`${formId}:${initial?.version ?? ""}`} id={formId} initial={initial} defaultCohort={viewer.isDemo ? "demo" : "live"}
          groups={[...new Set(profiles.map(p => p.group))].sort()} faculties={[...new Set(profiles.map(p => p.faculty))].sort()} years={[...new Set(profiles.map(p => p.year))].sort()} />
        <h2>Все объявления</h2>
        <ul className="request-list student-request-list">{items.map(item => <li className="surface request-summary" key={item.id}>
          <div className="request-row action-row"><strong>{item.title}</strong><span className="request-badge">{
            item.publication === "draft" ? "Черновик" : item.publication === "hidden" ? "Скрыто" : item.publishAt > now ? "Запланировано" : "Опубликовано"
          }</span></div>
          <p className="muted">
            {item.publication === "published" && `${dateLabel(item.publishAt, true)} · `}
            {item.target ?? announcementRoles[item.audience as keyof typeof announcementRoles] ?? "Студентам"}
            {item.cohort && ` · ${announcementCohorts[item.cohort]}`}
          </p>
          {item.text && <p className="preserve-lines">{item.text}</p>}
          <div className="request-row action-row">
            <Link className="text-action" href={`/staff/announcements?edit=${item.id}`}>Редактировать</Link>
            {item.publication === "published" && <form action={hideAnnouncement.bind(null, item.id, item.version)}>
              <button className="text-action" type="submit">Скрыть</button>
            </form>}
          </div>
        </li>)}</ul>
        {!items.length && <p className="muted">Объявлений пока нет.</p>}
        <ProjectLabel />
      </main>
    </CabinetShell>
  );
}
