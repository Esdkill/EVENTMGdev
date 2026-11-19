"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CabinetState, ProjectLabel, RequestHeader } from "./requests/request-ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return <main className="request-page account-page">
    <RequestHeader title="Цифровой деканат" end={null} />
    <CabinetState icon="menu-help" title="Что-то пошло не так" description="Попробуйте загрузить страницу снова." tone="error" role="alert"
      action={<button className="primary" type="button" disabled={pending} onClick={retry}>{pending ? "Загружаем…" : "Повторить"}</button>} />
    <ProjectLabel />
  </main>;
}
