"use client";

import Link from "next/link";
import { useState } from "react";
import { useRecoverableAction } from "../recoverable-action";
import { changeStudentPassword } from "./actions";

export function PasswordForm({ hasStudentNumber }: { hasStudentNumber: boolean }) {
  const [recover, setRecover] = useState(false);

  return <div className="detail-stack">
    {recover && !hasStudentNumber ? <div className="request-callout">
      <strong>Номер студенческого пока не указан</strong>
      <p>Если студенческий ещё не выдали, обратитесь в учебный деканат. Сотрудник поможет восстановить доступ.</p>
      <Link className="text-action request-with-icon" href="/help">Контакты деканата</Link>
    </div> : <PasswordInputs key={recover ? "recover" : "change"} recover={recover} />}
    <button type="button" className="text-action profile-recovery-action" onClick={() => setRecover(!recover)}>
      {recover ? "Вернуться к смене пароля" : "Не помню пароль"}
    </button>
  </div>;
}

function PasswordInputs({ recover }: { recover: boolean }) {
  const [state, submission, pending] = useRecoverableAction(changeStudentPassword, {});
  return (
    <form className="request-form profile-password-form" {...submission}>
      <input type="hidden" name="method" value={recover ? "student-number" : "password"} />
      {recover ? <>
        <label className="field">Номер студенческого
          <input name="studentNumber" autoComplete="off" autoCapitalize="characters" required maxLength={24} />
        </label>
        <p className="muted">Введите номер с билета. Если билета под рукой нет, <Link href="/help">обратитесь в деканат</Link>.</p>
      </> :
        <label className="field">Текущий пароль<input type="password" name="current" autoComplete="current-password" required maxLength={128} /></label>}
      <label className="field">Новый пароль<input type="password" name="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
      <label className="field">Повторите новый пароль<input type="password" name="confirmation" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
      <p className="muted">От 12 символов. После смены пароля остальные сеансы завершатся.</p>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.saved && <p role="status">Пароль изменён.</p>}
      <button className="primary" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить пароль"}</button>
    </form>
  );
}
