"use client";

import Link from "next/link";
import { announcementCohorts } from "../../../lib/announcement-audience";
import { useState } from "react";
import { useRecoverableAction } from "../../recoverable-action";
import { Icon } from "../../requests/request-ui";
import { createScheduleLesson } from "./actions";
import { formatLessonDay, lessonKinds } from "./lesson-fields";

export function ScheduleCreateForm({ groups, initialGroup, initialCohort, initialDay }: { groups: string[]; initialGroup: string; initialCohort: keyof typeof announcementCohorts | ""; initialDay: string }) {
  const [state, submission, pending] = useRecoverableAction(createScheduleLesson, { error: "" });
  const [fields, setFields] = useState({
    group: initialGroup, subject: "", kind: lessonKinds[0] as string, teacher: "", room: "", day: initialDay, start: "", end: "",
  });
  const [notify, setNotify] = useState(true);
  const { group, subject, kind, teacher, room, day, start, end } = fields;
  const wrongTime = !!(start && end && end <= start);
  const [cohort, setCohort] = useState(initialCohort);
  const complete = !!(group && cohort && subject.trim() && teacher.trim() && room.trim() && day && start && end && !wrongTime);

  function update(field: keyof typeof fields, value: string) {
    setFields(current => ({ ...current, [field]: value }));
  }

  if (!groups.length) return <section className="cabinet-glass request-summary staff-schedule-card">
    <h2>Добавьте учебную группу</h2>
    <p className="muted">После создания группы добавьте занятие в её расписание.</p>
    <Link className="primary request-button staff-schedule-link" href="/staff/students?view=groups">Создать группу</Link>
  </section>;

  return <div className="staff-detail-layout">
    <form {...submission} className="detail-stack">
      <section className="cabinet-glass request-form staff-schedule-card">
        <h2>Новое занятие</h2>
        <div className="staff-schedule-fields">
          <label className="field">Группа
            <select name="group" required value={group} onChange={event => update("group", event.target.value)}>
              <option value="">Выберите группу</option>
              {groups.map(code => <option key={code}>{code}</option>)}
            </select>
          </label>
          <label className="field">Тип занятия
            <select name="kind" value={kind} onChange={event => update("kind", event.target.value)}>
              {lessonKinds.map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="field staff-schedule-full">Кому показать занятие
            <select name="cohort" required value={cohort} onChange={event => setCohort(event.target.value as typeof cohort)}>
              <option value="">Выберите аудиторию</option>
              {Object.entries(announcementCohorts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="field staff-schedule-full">Дисциплина
            <input name="subject" required maxLength={120} value={subject} placeholder="Например, Анализ данных" onChange={event => update("subject", event.target.value)} />
          </label>
          <label className="field">Преподаватель
            <input name="teacher" required maxLength={120} value={teacher} placeholder="Имя и фамилия" onChange={event => update("teacher", event.target.value)} />
          </label>
          <label className="field">Аудитория
            <input name="room" required maxLength={50} value={room} placeholder="Например, А-204" onChange={event => update("room", event.target.value)} />
          </label>
          <label className="field staff-schedule-full">Дата
            <input type="date" name="day" required min="2000-01-01" max="2099-12-31" value={day} onChange={event => update("day", event.target.value)} />
          </label>
          <label className="field">Начало · МСК
            <input type="time" name="start" required value={start} onChange={event => update("start", event.target.value)} />
          </label>
          <label className="field">Окончание · МСК
            <input type="time" name="end" required value={end} onChange={event => update("end", event.target.value)}
              aria-invalid={wrongTime} aria-describedby={wrongTime ? "lesson-time-error" : undefined} />
          </label>
          {wrongTime && <p id="lesson-time-error" className="form-error staff-schedule-full" role="alert">Окончание должно быть позже начала.</p>}
        </div>
        <label className="toggle-row"><span>Уведомить студентов группы</span>
          <input type="checkbox" role="switch" name="notify" checked={notify} onChange={event => setNotify(event.target.checked)} />
        </label>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
      </section>
      <div className="cabinet-form-actions"><button className="primary" aria-busy={pending} disabled={pending || !complete}>
        {pending ? "Добавляем…" : "Добавить в расписание"}
      </button></div>
    </form>
    <section className="cabinet-glass request-summary staff-schedule-card">
      <div className="request-with-icon">
        <span className="schedule-notice-icon"><Icon name="schedule-calendar" size={21} monochrome /></span><h2>Предпросмотр занятия</h2>
      </div>
      {subject.trim() ? <>
        <strong>{subject} · {kind}</strong>
        <p className="muted">{[formatLessonDay(day), start && end && !wrongTime && `${start}–${end} МСК`, room.trim() && `ауд. ${room}`].filter(Boolean).join(" · ")}</p>
        {teacher.trim() && <p>{teacher}</p>}
        {group && <p className="muted">Группа {group}{cohort && ` · ${announcementCohorts[cohort]}`}{notify && " · с уведомлением"}</p>}
      </> : <p className="muted">Введите дисциплину, чтобы увидеть карточку занятия.</p>}
    </section>
  </div>;
}
