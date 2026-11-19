"use client";

import { useRef } from "react";
import { dialogBackdrop } from "../../../dialog-backdrop";
import { useRecoverableAction } from "../../../recoverable-action";
import { deleteStudent } from "../actions";

export function DeleteStudentForm({ studentId, name }: { studentId: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, submission, pending] = useRecoverableAction(deleteStudent.bind(null, studentId), {});

  function close() {
    if (!pending) dialog.current?.close();
  }

  return <>
    <button type="button" className="danger-outline" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
      Удалить аккаунт
    </button>
    <dialog ref={dialog} className="surface request-dialog"
      aria-labelledby="delete-student-title" aria-describedby="delete-student-description"
      onPointerDown={dialogBackdrop.onPointerDown} onClick={event => dialogBackdrop.onClick(event, close)}
      onCancel={event => { if (pending) event.preventDefault(); }}>
      <form className="detail-stack" {...submission}>
        <h2 id="delete-student-title">Удалить аккаунт студента?</h2>
        <div id="delete-student-description">
          <p><strong>{name}</strong></p>
          <p>Профиль, оценки, заявки, документы и обращения будут удалены. Сеансы входа завершатся. Восстановить аккаунт нельзя.</p>
        </div>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        <button type="button" className="secondary" disabled={pending} onClick={close}>Отмена</button>
        <button type="submit" className="danger-button" name="confirmation" value="delete"
          aria-busy={pending} disabled={pending}>{pending ? "Удаляем…" : "Удалить аккаунт"}</button>
      </form>
    </dialog>
  </>;
}
