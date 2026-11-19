"use client";

import Link from "next/link";
import { useState } from "react";
import { useRecoverableAction } from "./recoverable-action";
import { demoStudents } from "../lib/demo";
import { fullName, nameInitials } from "../lib/person-name";
import { signIn, signInDemo } from "./actions";
import { Icon, Initials } from "./requests/request-ui";

export function LoginForm({ demoUsernames, demoAvatars }: { demoUsernames: string[]; demoAvatars: Record<string, string | undefined> }) {
  const [state, submission, pending] = useRecoverableAction(signIn, { error: "" });
  const [demoState, demoSubmission, demoPending] = useRecoverableAction(signInDemo, { error: "" });
  const [visible, setVisible] = useState(false);
  const busy = pending || demoPending;

  return (
    <>
      <form {...submission} className="login-form cabinet-glass" aria-labelledby="login-title">
        <h2 id="login-title">Вход в кабинет</h2>
        <label className="field">
          <span>Логин</span>
          <span className="input-wrap">
            <input name="username" autoComplete="username" placeholder="Введите логин" required maxLength={100} />
            <Icon name="user" monochrome />
          </span>
        </label>
        <div className="field">
          <label htmlFor="login-password">Пароль</label>
          <div className="input-wrap">
            <input id="login-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Введите пароль" required maxLength={128} />
            <button className="icon-button password-toggle" type="button" aria-label={visible ? "Скрыть пароль" : "Показать пароль"} aria-pressed={visible} onClick={() => setVisible(!visible)}>
              <Icon name={visible ? "eye" : "eye-off"} monochrome />
            </button>
          </div>
        </div>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        <button className="primary" disabled={busy}>
          <Icon name="enter" monochrome />
          {pending ? "Входим…" : "Войти"}
        </button>
        <Link className="help-link" href="/help#access">Не помню пароль</Link>
        <p className="muted login-registration-note">Для регистрации обратитесь в деканат своего факультета.</p>
      </form>
      {demoUsernames.length > 0 && (
        <form className="demo-panel cabinet-glass" {...demoSubmission} aria-label="Демо-доступ">
          <div>
            <h2>Демо-доступ</h2>
            <p className="muted">Выберите аккаунт для входа</p>
          </div>
          <div className="demo-options">
            {demoStudents.filter(student => demoUsernames.includes(student.username)).map((student) => (
              <button key={student.username} name="demo" value={student.username} className="demo-account" disabled={busy}
                aria-label={`${fullName(student)} · ${student.group} · ${student.year} курс`}>
                <span className="demo-top">
                  <Initials name={fullName(student)} stored={student} src={demoAvatars[student.username]} />
                  <Icon name="chevron" size={14} monochrome />
                </span>
                <span className="demo-name">{student.lastName} {nameInitials(student)}</span>
                <span className="muted">{student.group} · {student.year} курс</span>
              </button>
            ))}
          </div>
          {demoState.error && <p className="form-error" role="alert">{demoState.error}</p>}
        </form>
      )}
    </>
  );
}
