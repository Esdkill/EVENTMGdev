"use client";

import { useState } from "react";
import { topics } from "../../lib/messages";
import { useRecoverableAction } from "../recoverable-action";
import { sendMessage } from "./actions";

export function MessageComposer({ id, submissionKey, staff = false, initialTopic = "" }: { id: string | null; submissionKey: string; staff?: boolean; initialTopic?: keyof typeof topics | "" }) {
  const [state, submission, pending] = useRecoverableAction(sendMessage.bind(null, id), { error: "" });
  const [text, setText] = useState("");
  const [topic, setTopic] = useState<string>(initialTopic);
  const [attachment, setAttachment] = useState("");
  return (
    <form className="request-form message-composer" {...submission}>
      <section className="surface request-form">
        <input type="hidden" name="key" value={submissionKey} />
        {!id && <label className="field">Тема
          <select name="topic" required value={topic} onChange={event => setTopic(event.target.value)}>
            <option value="">Выберите тему</option>
            {Object.entries(topics).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>}
        <label className="field">{staff ? "Ответ студенту" : id ? "Новое сообщение" : "Сообщение"}
          <textarea name="text" required rows={id ? 2 : 5} maxLength={2000} placeholder="Введите сообщение" value={text} onChange={event => setText(event.target.value)} />
          {!id && <span>{text.length} / 2000 символов</span>}
        </label>
        <label className="field attachment-field">
          <span className="secondary">{attachment || "Прикрепить файл"}</span>
          <input type="file" name="attachment" aria-label="Прикрепить файл" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={event => setAttachment(event.target.files?.[0]?.name ?? "")} />
          <span>Необязательно · PDF, JPG, PNG · до 10 МБ</span>
        </label>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
      </section>
      <button className="primary" aria-busy={pending} disabled={pending || !text.trim() || (!id && !topic)}>
        {pending ? "Отправляем…" : staff ? "Отправить ответ" : "Отправить"}
      </button>
    </form>
  );
}
