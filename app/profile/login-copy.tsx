"use client";

import { useState } from "react";

export function LoginCopy({ username, demo }: { username: string; demo: boolean }) {
  const [message, setMessage] = useState("");

  async function copyLogin() {
    try {
      await navigator.clipboard.writeText(username);
      setMessage("Логин скопирован.");
    } catch {
      setMessage("Выделите логин и скопируйте его вручную.");
    }
  }

  return <>
    <div className="login-copy">
      <dl className="profile-fields"><div><dt>{demo ? "Демо-логин" : "Логин"}</dt><dd>{username}</dd></div></dl>
      <button type="button" className="secondary" onClick={copyLogin} aria-label="Скопировать логин">Копировать</button>
    </div>
    <p className="login-copy-status" role="status" hidden={!message}>{message}</p>
  </>;
}
