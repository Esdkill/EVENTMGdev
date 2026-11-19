"use client";

import { dialogBackdrop } from "../../../dialog-backdrop";

import { useRef } from "react";
import { useRecoverableAction } from "../../../recoverable-action";
import { updateRequest } from "../../../request-actions";
import type { RequestStatus } from "../../../../generated/prisma/client";

export function StaffActions({ id, version, status, electronic, note }: {
  id: string; version: number; status: RequestStatus; electronic: boolean; note: string;
}) {
  const [state, submission, pending] = useRecoverableAction(updateRequest.bind(null, id), { error: "" });
  const ready = useRef<HTMLDialogElement>(null);
  const reject = useRef<HTMLDialogElement>(null);
  const pendingStatus = status === "NEW" || status === "READY";

  return (
    <div className="detail-stack">
      <form id="staff-note" className="surface request-form" {...submission}>
        <h2>Внутренний комментарий</h2>
        <label className="field"><span id="staff-note-hint">Виден только сотрудникам</span>
          <textarea name="note" aria-label="Внутренний комментарий" aria-describedby="staff-note-hint" defaultValue={note} maxLength={1000} rows={3} />
        </label>
        <input type="hidden" name="version" value={version} />
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
      </form>
      <div className={`cabinet-form-actions${status === "IN_PROGRESS" ? " cabinet-form-actions-stack" : pendingStatus ? " cabinet-form-actions-pair" : ""}`}>
        {status === "IN_PROGRESS" && <>
          <button className="primary" onClick={() => ready.current?.showModal()}>{electronic ? "Готово · прикрепить файл" : "Готово"}</button>
          <button className="danger-outline" onClick={() => reject.current?.showModal()}>Отклонить</button>
        </>}
        {pendingStatus && (
          <form {...submission}>
            <input type="hidden" name="version" value={version} />
            <button className="primary request-button" name="operation" value={status === "NEW" ? "start" : "issue"} disabled={pending}>
              {status === "NEW" ? "Взять в работу" : "Отметить выдачу"}
            </button>
          </form>
        )}
        <button type="submit" form="staff-note" name="operation" value="note" aria-describedby="staff-note-hint" className="secondary" disabled={pending}>
          Сохранить комментарий
        </button>
      </div>
      <dialog {...dialogBackdrop} ref={ready} className="surface request-dialog" aria-labelledby="ready-title">
        <form className="request-form" {...submission}>
          <h2 id="ready-title">Готовность</h2>
          {electronic && <label className="field">Готовый документ · PDF до 10 МБ<input type="file" name="document" accept="application/pdf,.pdf" required /></label>}
          <input type="hidden" name="version" value={version} />
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
          <button className="primary" name="operation" value="ready" disabled={pending}>Подтвердить готовность</button>
          <button type="button" className="secondary" onClick={() => ready.current?.close()}>Вернуться</button>
        </form>
      </dialog>
      <dialog {...dialogBackdrop} ref={reject} className="surface request-dialog" aria-labelledby="reject-title">
        <form className="request-form" {...submission}>
          <h2 id="reject-title">Отклонение</h2>
          <label className="field">Причина отказа<textarea name="reason" rows={3} required maxLength={500} /></label>
          <p className="muted">Причина будет видна студенту.</p>
          <input type="hidden" name="version" value={version} />
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
          <button className="danger-button" name="operation" value="reject" disabled={pending}>Подтвердить отклонение</button>
          <button type="button" className="secondary" onClick={() => reject.current?.close()}>Вернуться</button>
        </form>
      </dialog>
    </div>
  );
}
