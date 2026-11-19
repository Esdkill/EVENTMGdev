"use client";

import { dialogBackdrop } from "../../dialog-backdrop";

import { useRef } from "react";
import { useRecoverableAction } from "../../recoverable-action";
import { cancelRequest } from "../../request-actions";

export function CancelForm({ id, version }: { id: string; version: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, submission, pending] = useRecoverableAction(cancelRequest.bind(null, id), { error: "" });

  return (
    <>
      <button className="danger-button" type="button" onClick={() => dialog.current?.showModal()}>Отменить заявку</button>
      <dialog {...dialogBackdrop} ref={dialog} className="surface request-dialog" aria-labelledby="cancel-title">
        <h2 id="cancel-title">Отменить заявку?</h2>
        <p className="muted">Деканат прекратит её обработку.</p>
        <form className="request-form" {...submission}>
          <input type="hidden" name="version" value={version} />
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
          <button className="danger-button" disabled={pending}>Да, отменить</button>
          <button className="secondary" type="button" onClick={() => dialog.current?.close()}>Вернуться</button>
        </form>
      </dialog>
    </>
  );
}
