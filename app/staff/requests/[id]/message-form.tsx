"use client";

import { useState } from "react";
import { useRecoverableAction } from "../../../recoverable-action";
import { postRequestMessage } from "../../../request-actions";

export function MessageForm({ id, submissionKey }: { id: string; submissionKey: string }) {
  const [state, submission, pending] = useRecoverableAction(postRequestMessage.bind(null, id), { error: "" });
  const [message, setMessage] = useState("");

  return (
    <form className="request-form" {...submission}>
      <input type="hidden" name="key" value={submissionKey} />
      <label className="field">Сообщение студенту
        <textarea name="message" rows={3} required maxLength={1000} value={message} onChange={event => setMessage(event.target.value)} />
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="primary" disabled={pending || !message.trim()}>{pending ? "Отправляем…" : "Отправить студенту"}</button>
    </form>
  );
}
