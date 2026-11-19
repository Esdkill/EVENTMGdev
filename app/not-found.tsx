import Link from "next/link";
import { getRequestViewer } from "../lib/viewer";
import { CabinetNotificationsLink, CabinetShell } from "./cabinet-shell";
import { CabinetState, ProjectLabel, RequestHeader } from "./requests/request-ui";

export default async function NotFound() {
  const viewer = await getRequestViewer();
  const staff = viewer?.role === "staff";
  const content = (
    <main className="request-page account-page">
      <RequestHeader title="Ошибка 404" subtitle="Цифровой деканат" staff={staff} end={viewer && !staff ? <CabinetNotificationsLink /> : undefined} />
      <CabinetState icon="menu-help" title="Страница не найдена" description="Возможно, ссылка устарела или страница была перемещена."
        action={<Link className="secondary request-button" href={staff ? "/staff" : viewer ? "/cabinet" : "/"}>На главную</Link>} />
      <ProjectLabel />
    </main>
  );
  return viewer ? <CabinetShell role={staff ? "staff" : "student"} active="more" viewer={viewer} pageTitle="Ошибка 404">{content}</CabinetShell> : content;
}
