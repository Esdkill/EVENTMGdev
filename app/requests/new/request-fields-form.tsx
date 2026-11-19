"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { requestTypes } from "../../../lib/request-fields";
import type { DraftFields } from "../../../lib/request-draft-fields";
import { useRecoverableAction } from "../../recoverable-action";
import { createChatRequest, createRequest } from "../../request-actions";
import { Icon } from "../request-ui";

const fieldList = new Intl.ListFormat("ru");
const initialState = { error: "", id: undefined as string | undefined };

export type RequestDraftEdits = Partial<Omit<DraftFields, "purpose"> & { purpose: string; comment: string }>;

export function RequestFieldsForm({ submissionKey, source, focusNotice, onSent, onTypeChange, hidden, draftEdits, onDraftEdit }: {
  submissionKey: string;
  source?: { draft: DraftFields; demo: boolean };
  focusNotice?: boolean;
  hidden?: boolean;
  draftEdits?: RequestDraftEdits;
  onDraftEdit?: (patch: RequestDraftEdits) => void;
  onTypeChange?: (type: DraftFields["type"]) => void;
  onSent?: (id: string) => void;
}) {
  const [state, submission, pending] = useRecoverableAction(onSent ? createChatRequest : createRequest, initialState);
  const [localEdits, setLocalEdits] = useState<RequestDraftEdits>({});
  const edits = onDraftEdit ? draftEdits : localEdits;
  const type = edits?.type ?? (source ? source.draft.type : "enrollment");
  const copies = edits?.copies ?? (source ? source.draft.copies : 1);
  const delivery = edits?.delivery ?? (source ? source.draft.delivery : "pickup");
  const purpose = edits?.purpose ?? source?.draft.purpose ?? "";
  const comment = edits?.comment ?? "";
  const notice = useRef<HTMLDivElement>(null);
  const sent = useEffectEvent((id: string) => onSent?.(id));

  useEffect(() => {
    if (state.id) sent(state.id);
  }, [state.id]);

  useEffect(() => {
    if (source) setLocalEdits(current => ({ comment: current.comment }));
  }, [source]);

  useEffect(() => {
    if (source && focusNotice) notice.current?.focus();
  }, [source, focusNotice]);

  function edit(patch: RequestDraftEdits) {
    if (onDraftEdit) onDraftEdit(patch);
    else setLocalEdits(current => ({ ...current, ...patch }));
  }

  const aiBadge = <span className="request-draft-badge" aria-hidden="true">ИИ</span>;
  const missing = [
    !type && "тип документа",
    !purpose.trim() && "цель получения",
    !copies && "количество экземпляров",
    !delivery && "способ получения",
  ].filter(field => field !== false);
  const complete = missing.length === 0;

  return (
    <form className="request-form" {...submission} onSubmit={event => {
      if (!hidden && complete) submission.onSubmit(event);
      else event.preventDefault();
    }} hidden={hidden}>
      <input type="hidden" name="key" value={submissionKey} />
      {source && <div ref={notice} tabIndex={-1} className="request-callout request-with-icon request-draft-notice" role="status">
        <span className="request-draft-icon"><Icon name="request-draft" size={20} monochrome /></span>
        <div>
          <strong>{source.demo ? "Демо-черновик" : "Черновик ИИ"}</strong>
          <p className="muted">{complete ? "Проверьте данные перед отправкой." : `Осталось указать ${fieldList.format(missing)}.`}</p>
        </div>
      </div>}
      <label className="field">
        <span className="request-draft-label">Тип документа{type && type === source?.draft.type && aiBadge}</span>
        <select name="type" value={type ?? ""} required onChange={event => {
          const selected = event.target.value as keyof typeof requestTypes;
          edit({ type: selected });
          onTypeChange?.(selected);
        }}>
          <option value="" disabled>Выберите документ</option>
          {Object.entries(requestTypes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label className="field">
        <span className="request-draft-label">Цель получения{purpose && purpose === source?.draft.purpose && aiBadge}</span>
        <input name="purpose" value={purpose} onChange={event => edit({ purpose: event.target.value })} required maxLength={200} placeholder="Например, по месту работы" />
      </label>
      <div className="field">
        <span className="request-draft-label">Количество экземпляров{copies && copies === source?.draft.copies && aiBadge}</span>
        <div className="request-counter">
          <button type="button" className="icon-button" aria-label="Уменьшить количество" disabled={copies === null || copies <= 1} onClick={() => edit({ copies: Math.max(1, (copies ?? 1) - 1) })}><Icon name="request-minus" monochrome /></button>
          <output aria-live="polite">{copies ?? "От 1 до 3 экземпляров"}</output>
          <button type="button" className="icon-button" aria-label="Увеличить количество" disabled={copies === 3} onClick={() => edit({ copies: Math.min(3, (copies ?? 0) + 1) })}><Icon name="request-counter-plus" monochrome /></button>
          <input type="hidden" name="copies" value={copies ?? ""} />
        </div>
      </div>
      <fieldset className="field delivery-field">
        <legend><span className="request-draft-label">Как получить{delivery && delivery === source?.draft.delivery && aiBadge}</span></legend>
        <div className="delivery-options">
          <label><input type="radio" name="delivery" value="pickup" required checked={delivery === "pickup"} onChange={() => edit({ delivery: "pickup" })} /><span>В деканате</span></label>
          <label><input type="radio" name="delivery" value="electronic" checked={delivery === "electronic"} onChange={() => edit({ delivery: "electronic" })} /><span>Электронно</span></label>
        </div>
      </fieldset>
      <label className="field">Комментарий · необязательно
        <textarea name="comment" rows={3} maxLength={1000} value={comment} onChange={event => edit({ comment: event.target.value })} placeholder="Что нужно уточнить деканату?" />
      </label>
      <div className="request-callout request-with-icon"><Icon name="request-clock" monochrome /><p>Подготовим за 3 рабочих дня.<br />Готовый документ появится в заявке.</p></div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="primary" aria-busy={pending} disabled={pending || !complete}><Icon name="enter" monochrome />{pending ? "Отправляем…" : "Отправить"}</button>
      {!source && <p className="muted request-centered">Перед отправкой проверьте данные.</p>}
    </form>
  );
}
