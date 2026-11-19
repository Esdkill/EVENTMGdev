"use client";

import Link from "next/link";
import { studentDocumentFields } from "../../../lib/student-documents";
import { useRecoverableAction } from "../../recoverable-action";
import { createGroup, createStudent } from "./actions";

const nameFields = [["lastName", "Фамилия"], ["firstName", "Имя"], ["patronymic", "Отчество"]] as const;

export function StudentForm({ groups }: { groups: string[] }) {
  const [state, submission, pending] = useRecoverableAction(createStudent, {});
  return (
    <>
      <form {...submission} className="surface request-form student-form">
        <h2>Новый студент</h2>
        <div className="student-name-fields">
          {nameFields.map(([name, label]) => {
            const error = state.field === name ? state.error : undefined;
            return <div className="field" key={name}>
              <label htmlFor={`student-${name}`}>{label}</label>
              <input id={`student-${name}`} name={name} required maxLength={50} autoComplete="off"
                aria-invalid={error ? true : undefined} aria-describedby={error ? `error-${name}` : undefined} />
              {error && <span className="form-error" id={`error-${name}`} role="alert">{error}</span>}
            </div>;
          })}
        </div>
        <label className="field">Логин<input name="username" required minLength={3} maxLength={30} autoComplete="off" autoCapitalize="none"
          aria-invalid={state.field === "username" || undefined} aria-describedby={state.field === "username" ? "student-create-error" : undefined} /></label>
        {studentDocumentFields.map(({ name, label }) => <label className="field" key={name}>
          <span>{label} <span className="muted">· Необязательно</span></span>
          <input name={name} maxLength={24} autoComplete="off" autoCapitalize="characters" spellCheck={false}
            aria-invalid={state.field === name || undefined} aria-describedby={state.field === name ? "student-create-error" : undefined} />
        </label>)}
        <label className="field">Факультет<input name="faculty" required maxLength={100} /></label>
        <label className="field">Направление<input name="program" required maxLength={100} /></label>
        <label className="field">Группа<input name="group" list="student-groups" required maxLength={30} /></label>
        <datalist id="student-groups">{groups.map(group => <option key={group} value={group} />)}</datalist>
        <label className="field">Курс
          <select name="year">{[1, 2, 3, 4, 5, 6].map(year => <option key={year} value={year}>{year} курс</option>)}</select>
        </label>
        {state.error && !nameFields.some(([name]) => name === state.field) && <p className="form-error" role="alert" id="student-create-error">{state.error}</p>}
        <button className="primary" disabled={pending}>{pending ? "Создаём…" : "Создать аккаунт"}</button>
      </form>
      {state.credentials && <section className="surface request-summary credentials" role="status">
        <h2>Аккаунт создан</h2>
        <p>Логин <code>{state.credentials.username}</code></p>
        <p>Временный пароль <code>{state.credentials.password}</code></p>
        <p className="muted">Передайте данные студенту. Пароль показывается только здесь. Он действует 24 часа. При первом входе студент задаст свой.</p>
      </section>}
    </>
  );
}

export function GroupForm() {
  const [state, submission, pending] = useRecoverableAction(createGroup, {});
  return <form {...submission} className="request-form cabinet-glass staff-group-form">
    <h2>Новая группа</h2>
    <label className="field">Код группы
      <input name="code" placeholder="Например, БИ-1-1" required maxLength={30} autoComplete="off"
        aria-invalid={!!state.error} aria-describedby={state.error ? "group-code-error" : undefined} />
    </label>
    {state.error && <p id="group-code-error" className="form-error" role="alert">{state.error}</p>}
    {state.created && <div className="request-callout" role="status">
      <p>Группа {state.created} создана.</p>
      <Link href={`/staff/schedule?mode=add&group=${encodeURIComponent(state.created)}`}>Добавить занятие для группы</Link>
    </div>}
    <button className="primary" disabled={pending}>{pending ? "Создаём…" : "Создать группу"}</button>
  </form>;
}
