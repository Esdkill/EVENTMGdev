"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { DraftFields } from "../../../lib/request-draft-fields";
import { Icon } from "../request-ui";
import { prepareRequestDraft } from "./draft-action";

export function DraftAssistant({ onApply }: { onApply: (draft: DraftFields, demo: boolean) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const preparing = useRef(false);
  async function prepare(text: string) {
    if (preparing.current) return;
    preparing.current = true;
    setError("");
    setPending(true);
    try {
      const result = await prepareRequestDraft(text);
      if ("error" in result) setError(result.error);
      else if (formRef.current) onApply(result.draft, result.demo);
    } catch {
      setError("Не удалось подготовить черновик. Проверьте соединение или заполните заявку вручную.");
    } finally {
      preparing.current = false;
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void prepare(description);
  }

  return <section className="surface request-summary request-draft-panel">
    <div className="request-row action-row">
      <h2>Помощник для заявки</h2><Link href="/help#faq">Частые вопросы</Link>
    </div>
    <form ref={formRef} className="request-form" onSubmit={submit}>
      <label className="field">Какая справка нужна?
        <textarea rows={3} minLength={8} maxLength={1000} required value={description} disabled={pending}
          placeholder="Например, справка об обучении для работы, два экземпляра, электронно"
          aria-describedby="request-draft-hint"
          onChange={event => { setDescription(event.target.value); setError(""); }} />
      </label>
      <p className="muted" id="request-draft-hint">Опишите справку без персональных данных.</p>
      <button className="primary" aria-busy={pending} disabled={pending || description.trim().length < 8}>
        <Icon name="home-file-plus" monochrome />{pending ? "Заполняем форму…" : "Заполнить форму"}
      </button>
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
