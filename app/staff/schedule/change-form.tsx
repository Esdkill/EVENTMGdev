"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { announcementCohorts } from "../../../lib/announcement-audience";
import { useRecoverableAction } from "../../recoverable-action";
import { Icon } from "../../requests/request-ui";
import { saveScheduleChange } from "./actions";
import { formatLessonStart } from "./lesson-fields";

type Lesson = { id: string; subject: string; cohort: keyof typeof announcementCohorts; start: string; end: string; room: string; version: number; status: string };
export function ScheduleChangeForm({ lessons, initialGroup, groups }: { lessons: Lesson[]; initialGroup: string; groups: string[] }) {
  const router = useRouter();
  const [state, submission, pending] = useRecoverableAction(saveScheduleChange, { error: "" });
  const [group, setGroup] = useState(initialGroup);
  const [id, setId] = useState("");
  const [kind, setKind] = useState("rescheduled");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [room, setRoom] = useState("");
  const [reason, setReason] = useState("");
  const loading = group !== initialGroup;
  const options = loading ? [] : lessons;
  const selected = options.find(lesson => lesson.id === id);
  const rescheduling = kind === "rescheduled";
  const differentDays = !!(start && end && start.slice(0, 10) !== end.slice(0, 10));
  const wrongTime = !!(start && end && end <= start);
  const timeError = differentDays ? "Укажите начало и окончание в один день." : wrongTime ? "Окончание должно быть позже начала." : "";
  const sameSlot = !!(selected && selected.status !== "cancelled" && start === selected.start && end === selected.end && room.trim() === selected.room);
  const invalidChange = rescheduling && (!start || !end || !room.trim() || !!timeError || sameSlot);

  function selectGroup(value: string) {
    setGroup(value);
    selectLesson("");
    router.replace(value ? `/staff/schedule?group=${encodeURIComponent(value)}` : "/staff/schedule", { scroll: false });
  }

  function selectLesson(value: string) {
    setId(value);
    setKind("rescheduled");
    setReason("");
    const lesson = options.find(lesson => lesson.id === value);
    setStart(lesson?.start ?? "");
    setEnd(lesson?.end ?? "");
    setRoom(lesson?.room ?? "");
  }

  return (
    <div className="staff-detail-layout">
      <form {...submission} className="detail-stack">
        <section className="cabinet-glass request-form staff-schedule-card">
          <h2>Изменение занятия</h2>
          <label className="field">Группа<select name="group" required value={group} onChange={e => selectGroup(e.target.value)}>
            <option value="">Выберите группу</option>{groups.map(value => <option key={value}>{value}</option>)}
          </select></label>
          <label className="field">Занятие<select name="id" value={id} onChange={e => selectLesson(e.target.value)} required disabled={!options.length} aria-busy={loading}>
            <option value="">{loading ? "Загружаем занятия…" : "Выберите занятие"}</option>
            {options.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.subject} · {formatLessonStart(lesson.start)} · {lesson.cohort === "demo" ? "Демо" : "Обычные"}{lesson.status === "cancelled" && " · отменено"}</option>)}
          </select></label>
          {group && !loading && !options.length && <p className="muted">У группы пока нет занятий. <Link href={`/staff/schedule?mode=add&group=${encodeURIComponent(group)}`}>Добавить занятие</Link></p>}
          {selected && <>
            <input type="hidden" name="version" value={selected.version} />
            <label className="field">Тип изменения
              <select name="kind" value={kind} onChange={e => setKind(e.target.value)}>
                <option value="rescheduled">Перенос</option><option value="cancelled" disabled={selected.status === "cancelled"}>Отмена</option>
              </select>
            </label>
            {rescheduling && <>
              <div className="staff-schedule-fields">
                <label className="field">Новое начало · МСК<input type="datetime-local" name="start" required value={start} onChange={e => setStart(e.target.value)} /></label>
                <label className="field">Новое окончание · МСК<input type="datetime-local" name="end" required value={end} onChange={e => setEnd(e.target.value)}
                  aria-invalid={!!timeError} aria-describedby={timeError ? "change-time-error" : undefined} /></label>
              </div>
              {timeError && <p id="change-time-error" className="form-error" role="alert">{timeError}</p>}
              <label className="field">Новая аудитория<input name="room" required maxLength={50} value={room} onChange={e => setRoom(e.target.value)} /></label>
              {sameSlot && <p className="muted">Укажите новое время или аудиторию.</p>}
            </>}
            <label className="field">Причина<textarea name="reason" required rows={2} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
          </>}
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
        </section>
        <div className="cabinet-form-actions">
          <button className="primary" aria-busy={pending} disabled={pending || !selected || !reason.trim() || invalidChange}>Сохранить и уведомить</button>
        </div>
      </form>
      <section className="cabinet-glass request-summary staff-schedule-card">
        <div className="request-with-icon">
          <span className="schedule-notice-icon"><Icon name="schedule-notice" size={21} monochrome /></span><h2>Уведомление группе</h2>
        </div>
        {selected ? <>
          <strong>{selected.subject} · {rescheduling ? "Перенос" : "Отмена"}</strong>
          {rescheduling ? <>
            <p className="muted">Было {formatLessonStart(selected.start)} · ауд. {selected.room}</p>
            {start && end && !timeError && room.trim() && <p>Стало {formatLessonStart(start)}–{end.split("T")[1]} · ауд. {room}</p>}
          </> : <p>Занятие {formatLessonStart(selected.start)} отменено.</p>}
          {reason.trim() && <p>{reason}</p>}
          <p className="muted">{announcementCohorts[selected.cohort]} группы {group}</p>
        </> : <p className="muted">Выберите занятие для предпросмотра.</p>}
      </section>
    </div>
  );
}
