"use client";

import { dialogBackdrop } from "../../../dialog-backdrop";

import { useRef, useState } from "react";
import { useRecoverableAction } from "../../../recoverable-action";
import { updateStudentAccess } from "../actions";

type Operation = "issue" | "revoke";

export function AccessForm({ studentId, hasPassword }: { studentId: string; hasPassword: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [operation, setOperation] = useState<Operation | null>(null);

  function review(next: Operation) {
    setOperation(next);
    dialog.current?.showModal();
  }

  function close() {
    setOperation(null);
    dialog.current?.close();
  }

  return <div className="detail-stack">
    <button type="button" className="primary" onClick={() => review("issue")}>Выдать временный пароль</button>
    {hasPassword && <button type="button" className="danger-outline" onClick={() => review("revoke")}>Отозвать пароль</button>}
    <dialog {...dialogBackdrop} ref={dialog} className="surface request-dialog" aria-label="Подтверждение изменения доступа" onClose={() => setOperation(null)}>
      {operation && <Confirmation studentId={studentId} operation={operation} close={close} />}
    </dialog>
  </div>;
}

function Confirmation({ studentId, operation, close }: { studentId: string; operation: Operation; close: () => void }) {
  const [state, submission, pending] = useRecoverableAction(updateStudentAccess.bind(null, studentId), {});
  const issue = operation === "issue";

  if (state.credentials) return <div className="detail-stack credentials" role="status">
    <h2>Временный пароль выдан</h2>
    <p><code>{state.credentials.password}</code></p>
    <p className="muted">Действует до {new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "short", timeStyle: "short", timeZone: "Europe/Moscow",
    }).format(new Date(state.credentials.expiresAt))} мск.</p>
    <p>Передайте пароль студенту. Он показывается только здесь. При входе студент задаст свой пароль.</p>
    <button type="button" className="secondary" onClick={close}>Закрыть</button>
  </div>;

  if (state.revoked) return <div className="detail-stack" role="status">
    <h2>Пароль отозван</h2>
    <p>Сеансы студента завершены. Для входа понадобится временный пароль.</p>
    <button type="button" className="secondary" onClick={close}>Закрыть</button>
  </div>;

  return <form className="detail-stack" {...submission}>
    <h2>{issue ? "Выдать временный пароль?" : "Отозвать пароль?"}</h2>
    <p>Текущий пароль перестанет действовать. Все сеансы студента завершатся.</p>
    <input type="hidden" name="operation" value={operation} />
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button className={issue ? "primary" : "danger-outline"} disabled={pending}>{pending ? "Сохраняем…" : issue ? "Выдать пароль" : "Отозвать пароль"}</button>
    <button type="button" className="secondary" disabled={pending} onClick={close}>Отмена</button>
  </form>;
}
