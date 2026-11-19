import { redirect } from "next/navigation";
import { readViewer } from "../../lib/viewer";
import { ConfirmSignOut } from "../confirm-signout";
import { ActivateForm } from "./activate-form";

export default async function ActivatePage() {
  const viewer = await readViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "student" || !viewer.mustChangePassword) redirect("/cabinet");
  return (
    <main className="cabinet-page activation-page">
      <header className="cabinet-header">
        <h1>Первый вход</h1>
        <ConfirmSignOut className="secondary">Выйти</ConfirmSignOut>
      </header>
      <p className="muted">Задайте свой пароль длиной от 12 символов. Затем войдите с ним в кабинет.</p>
      <ActivateForm />
      <footer className="project-label">Конкурсный проект</footer>
    </main>
  );
}
