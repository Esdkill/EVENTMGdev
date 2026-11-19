"use client";

import { startTransition, useActionState, useRef } from "react";
import type { FormEvent } from "react";
import { isConnectionError, showOfflineNotice } from "./connection";

export function useRecoverableAction<State extends { error?: string }>(
  action: (state: State, fields: FormData) => Promise<State>,
  initialState: State,
) {
  const submitting = useRef<HTMLFormElement | null>(null);
  const [state, dispatch, pending] = useActionState<State, FormData>(async (previous, fields) => {
    try {
      if (!navigator.onLine) throw new TypeError("Network request failed");
      const result = await action(previous, fields);
      if (!result?.error) submitting.current?.reset();
      return result;
    } catch (error) {
      if (!isConnectionError(error)) throw error;
      showOfflineNotice();
      return { ...initialState, error: "Нет соединения. Проверьте сеть и попробуйте ещё раз." };
    } finally {
      submitting.current = null;
    }
  }, initialState as Awaited<State>);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form, (event.nativeEvent as SubmitEvent).submitter);
    submitting.current = form;
    startTransition(() => dispatch(fields));
  }

  return [state, { method: "post" as const, onSubmit }, pending] as const;
}
