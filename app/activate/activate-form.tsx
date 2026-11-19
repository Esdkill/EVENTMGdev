"use client";

import { useRecoverableAction } from "../recoverable-action";
import { activateStudent } from "./actions";

export function ActivateForm() {
  const [state, submission, pending] = useRecoverableAction(activateStudent, { error: "" });
  return (
    <form className="surface request-form" {...submission}>
      <label className="field">Временный пароль<input type="password" name="temporary" autoComplete="current-password" required maxLength={128} /></label>
      <label className="field">Новый пароль<input type="password" name="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
      <label className="field">Повторите новый пароль<input type="password" name="confirmation" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="primary" disabled={pending}>Сохранить пароль</button>
    </form>
  );
}
