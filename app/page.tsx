import { getSessionCookie } from "better-auth/cookies";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { demoStudents } from "../lib/demo";
import { avatarSource } from "../lib/user-avatar";
import { readViewer, sessionMarker } from "../lib/viewer";
import { LoginMotion } from "./login-motion";
import { LoginForm } from "./login-form";
import { Icon } from "./requests/request-ui";

export default async function Home({ searchParams }: { searchParams: Promise<{ activated?: string }> }) {
  const viewer = await readViewer();
  if (viewer) redirect(viewer.mustChangePassword ? "/activate" : "/cabinet");

  const { activated } = await searchParams;
  const expired = activated !== "1" && ((await cookies()).has(sessionMarker) || Boolean(getSessionCookie(await headers())));
  const demoEnabled = process.env.DEMO_ACCESS === "true";
  const demoUsers = demoEnabled ? await db.user.findMany({
    where: { username: { in: demoStudents.map(student => student.username) }, role: "student", isDemo: true },
    select: { username: true, avatar: { select: { updatedAt: true } } },
  }).catch(() => []) : [];
  const demoAvatars = Object.fromEntries(demoUsers.flatMap(({ username, avatar }) =>
    username && avatar ? [[username, avatarSource(avatar, username)]] : []));

  return (
    <main className="login-page">
      <div className="login-content">
        <header className="welcome">
          <LoginMotion />
          <Icon name="deanery" size={44} monochrome />
          <h1>Цифровой деканат</h1>
          <p>Проверяйте расписание и оценки, следите за переносами занятий. Заказывайте справки и узнавайте, когда они будут готовы.</p>
        </header>
        <div className="login-access">
          {activated === "1" && <p className="request-callout" role="status">Пароль сохранён. Войдите с новым паролем.</p>}
          {expired && <p className="request-callout session-notice request-with-icon" role="status">
            <Icon name="request-clock" size={20} monochrome />Сессия истекла. Войдите снова.
          </p>}
          <LoginForm demoUsernames={demoUsers.map(user => user.username ?? "")} demoAvatars={demoAvatars} />
        </div>
      </div>
      <footer className="project-label">Конкурсный проект</footer>
    </main>
  );
}
