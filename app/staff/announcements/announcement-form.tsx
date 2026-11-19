"use client";

import { dialogBackdrop } from "../../dialog-backdrop";

import { useRef, useState } from "react";
import { announcementCohorts, announcementRoles, announcementSegments } from "../../../lib/announcement-audience";
import { useRecoverableAction } from "../../recoverable-action";
import { publishAnnouncement } from "./actions";

export type AnnouncementInitial = {
  version: number;
  title: string;
  text: string;
  role: keyof typeof announcementRoles;
  cohort: keyof typeof announcementCohorts;
  segment: keyof typeof announcementSegments;
  target: string;
  date: string;
  important: boolean;
  attachment: string;
  publication: "published" | "draft" | "hidden";
};

export function AnnouncementForm({ id, groups, faculties, years, defaultCohort, initial }: {
  id: string; groups: string[]; faculties: string[]; years: number[]; defaultCohort: keyof typeof announcementCohorts;
  initial?: AnnouncementInitial;
}) {
  const [state, submission, pending] = useRecoverableAction(publishAnnouncement, { error: "" });
  const [title, setTitle] = useState(initial?.title ?? "");
  const [text, setText] = useState(initial?.text ?? "");
  const [role, setRole] = useState<keyof typeof announcementRoles>(initial?.role ?? "all");
  const [cohort, setCohort] = useState(initial?.cohort ?? defaultCohort);
  const [segment, setSegment] = useState<keyof typeof announcementSegments>(initial?.segment ?? "all");
  const [target, setTarget] = useState(initial?.target ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [important, setImportant] = useState(initial?.important ?? false);
  const [attachment, setAttachment] = useState(initial?.attachment ?? "");
  const dialog = useRef<HTMLDialogElement>(null);
  const options = segment === "group" ? groups : segment === "faculty" ? faculties : years.map(String);
  const scoped = role === "all" && segment !== "all";
  const valid = title.trim() && text.trim() && (!scoped || target);
  const recipients = scoped ? `${announcementSegments[segment]} · ${target || "выберите получателей"}` : announcementRoles[role];

  const preview = (heading: string) => <div className="request-summary">
    <h2>{heading}</h2>
    {important && <p><span className="request-badge status-in_progress">Важное</span></p>}
    <strong>{title || "Заголовок объявления"}</strong>
    <p className="muted">{date ? date.replace("T", " · ") + " МСК" : "После публикации"} · Деканат</p>
    <p className="preserve-lines">{text || "Здесь появится текст объявления."}</p>
    {attachment && <p className="muted">Вложение · {attachment}</p>}
    <p className="muted">Получатели: {recipients} · {announcementCohorts[cohort]}</p>
  </div>;

  return (
    <form {...submission} className="staff-detail-layout">
      <div className="detail-stack">
        <section className="surface request-form">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="version" value={initial?.version ?? ""} />
          <h2>{initial ? "Редактирование объявления" : "Новое объявление"}</h2>
          <label className="field">Заголовок<input name="title" required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></label>
          <label className="field">Текст<textarea name="text" rows={4} maxLength={3000} value={text} onChange={e => setText(e.target.value)} /></label>
          <fieldset className="field delivery-field">
            <legend>Режим публикации</legend>
            <div className="delivery-options announcement-cohort-options">
              {(Object.keys(announcementCohorts) as (keyof typeof announcementCohorts)[]).map(value => <label key={value}>
                <input type="radio" name="cohort" value={value} checked={cohort === value} onChange={() => setCohort(value)} />
                <span>{announcementCohorts[value]}</span>
              </label>)}
            </div>
          </fieldset>
          <fieldset className="field delivery-field">
            <legend>Кому показать объявление</legend>
            <div className="delivery-options announcement-role-options">
              {(Object.keys(announcementRoles) as (keyof typeof announcementRoles)[]).map(value => <label key={value}>
                <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} />
                <span>{announcementRoles[value]}</span>
              </label>)}
            </div>
          </fieldset>
          {role === "all" && <label className="field">Уточнить аудиторию
            <select name="segment" value={segment} onChange={e => { setSegment(e.target.value as keyof typeof announcementSegments); setTarget(""); }}>
              {Object.entries(announcementSegments).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>}
          {scoped ? <label className="field">Получатели
            <select name="target" value={target} onChange={e => setTarget(e.target.value)}><option value="">Выберите получателей</option>{options.map(value => <option key={value}>{value}</option>)}</select>
          </label> : <input type="hidden" name="target" value="" />}
          <label className="field">Дата публикации · МСК<input type="datetime-local" name="publishAt" value={date} onChange={e => setDate(e.target.value)} /><span>Оставьте пустой, чтобы опубликовать сразу</span></label>
          <label className="toggle-row"><span>Важное объявление</span><input type="checkbox" name="important" checked={important} onChange={e => setImportant(e.target.checked)} /></label>
          <label className="field attachment-field">
            <span className="secondary">{attachment || "Прикрепить файл"}</span>
            <input type="file" name="attachment" accept=".pdf,.jpg,.jpeg,.png" aria-label="Прикрепить файл"
              onChange={event => setAttachment(event.target.files?.[0]?.name ?? initial?.attachment ?? "")} />
            <span>Необязательно · PDF, JPG, PNG · до 10 МБ</span>
          </label>
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
        </section>
        <div className={initial?.publication === "published" ? "cabinet-form-actions" : "cabinet-form-actions cabinet-form-actions-pair"}>
          {initial?.publication !== "published" && <button type="submit" name="intent" value="save" className="secondary" disabled={pending || !title.trim()}>
            {initial?.publication === "hidden" ? "Сохранить скрытым" : "Сохранить черновик"}
          </button>}
          <button type="button" className="primary" disabled={pending || !valid} onClick={() => dialog.current?.showModal()}>Предпросмотр</button>
        </div>
      </div>
      <section className="surface announcement-preview">{preview("Как выглядит объявление")}</section>
      <dialog {...dialogBackdrop} className="surface request-dialog" ref={dialog} aria-label="Предпросмотр объявления">
        <div className="request-form">
          {preview("Предпросмотр")}
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
          <button name="intent" value="publish" className="primary" aria-busy={pending} disabled={pending || !valid}>
            {pending ? "Сохраняем…" : initial?.publication === "published" ? "Сохранить изменения" : cohort === "demo" ? "Опубликовать для демо" : "Опубликовать для обычных аккаунтов"}
          </button>
          <button type="button" className="secondary" onClick={() => dialog.current?.close()}>Вернуться к форме</button>
        </div>
      </dialog>
    </form>
  );
}
