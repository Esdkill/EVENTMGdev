"use client";

import { useId, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { signOut } from "./actions";
import { dialogBackdrop } from "./dialog-backdrop";
import { useRecoverableAction } from "./recoverable-action";

export function SignOutDialog({ dialog, onClose }: {
  dialog: RefObject<HTMLDialogElement | null>; onClose?: () => void;
}) {
  const title = useId();
  const description = useId();
  const [state, submission, pending] = useRecoverableAction(signOut, { error: "" });

  function close() {
    if (!pending) dialog.current?.close();
  }

  return <dialog ref={dialog} className="surface request-dialog" aria-labelledby={title} aria-describedby={description}
    onClose={onClose} onCancel={event => { if (pending) event.preventDefault(); }}
    onPointerDown={dialogBackdrop.onPointerDown} onClick={event => dialogBackdrop.onClick(event, close)}>
    <h2 id={title}>Выйти из кабинета?</h2>
    <p id={description} className="muted">Вы сможете войти снова. Отправленные заявки сохранятся.</p>
    <form className="signout-actions" {...submission}>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="secondary" type="button" autoFocus onClick={close} disabled={pending}>Отмена</button>
      <button className="danger-button" type="submit" aria-busy={pending} disabled={pending}>{pending ? "Выходим…" : "Выйти"}</button>
    </form>
  </dialog>;
}

export function ConfirmSignOut({ children, className }: { children: ReactNode; className: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button className={className} type="button" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>{children}</button>
    <SignOutDialog dialog={dialog} />
  </>;
}
