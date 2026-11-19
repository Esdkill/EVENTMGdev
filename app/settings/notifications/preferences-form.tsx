"use client";

import { useState } from "react";
import { saveNotificationPreferences } from "../../notifications/actions";
import { useRecoverableAction } from "../../recoverable-action";

const options = [
  ["deadlines", "Дедлайны"], ["schedule", "Изменения расписания"],
  ["requests", "Статусы заявок"], ["news", "Новости деканата"],
] as const;

export function PreferencesForm({ settings }: {
  settings: Record<typeof options[number][0], boolean> | null;
}) {
  const [values, setValues] = useState(settings ?? { deadlines: true, schedule: true, requests: true, news: true });
  const [state, submission, pending] = useRecoverableAction(saveNotificationPreferences, { error: "" });
  const saved = state.preferences && options.every(([id]) => values[id] === state.preferences?.[id]);
  return (
    <form className="surface request-form" {...submission}>
      <h2>Что присылать</h2>
      {options.map(([id, label]) => <label className="toggle-row" key={id}>
        <span>{label}</span><input type="checkbox" role="switch" name={id} checked={values[id]}
          onChange={event => setValues({ ...values, [id]: event.target.checked })} />
      </label>)}
      {state.error
        ? <p className="form-error" role="alert">{state.error}</p>
        : saved && <p className="request-callout" role="status">Настройки сохранены</p>}
      <button className="primary" aria-busy={pending} disabled={pending}>{pending ? "Сохраняем…" : "Сохранить настройки"}</button>
    </form>
  );
}
