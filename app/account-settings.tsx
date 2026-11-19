"use client";

import { dialogBackdrop } from "./dialog-backdrop";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { RefObject } from "react";
import { demoPasswordRestriction } from "../lib/demo";
import { CurrentTheme, ThemeOptions } from "./more/theme-options";
import { PasswordForm } from "./profile/password-form";
import { Icon } from "./requests/request-ui";
import { readStudentSettings } from "./settings/actions";
import { PreferencesForm } from "./settings/notifications/preferences-form";

const panels = {
  theme: { title: "Тема оформления", icon: "home-sun" },
  password: { title: "Сменить пароль", icon: "account-settings" },
  notifications: { title: "Настройки уведомлений", icon: "home-bell" },
} as const;
type Panel = keyof typeof panels;
type StudentSettings = Awaited<ReturnType<typeof readStudentSettings>>;

export function MobileAccountSettings({ staff }: { staff: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return <>
    <button type="button" className="menu-link mobile-settings-trigger" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
      <Icon name="account-settings" size={20} monochrome />
      <span className="menu-label">Настройки</span>
      <Icon name="request-chevron" size={14} monochrome />
    </button>
    <AccountSettingsDialog dialog={dialog} staff={staff} />
  </>;
}

export function AccountSettingsDialog({ dialog, staff, onClose }: {
  dialog: RefObject<HTMLDialogElement | null>;
  staff: boolean;
  onClose?: () => void;
}) {
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [settings, setSettings] = useState<StudentSettings | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!panel || panel === "theme") return;
    let active = true;
    readStudentSettings().then(
      result => { if (active) setSettings(result); },
      () => { if (active) setLoadError(true); },
    );
    return () => { active = false; };
  }, [panel, attempt]);

  useEffect(() => {
    if (dialog.current?.open) heading.current?.focus();
  }, [dialog, panel]);

  function navigate(next: Panel | null) {
    setSettings(undefined);
    setLoadError(false);
    setPanel(next);
    if (dialog.current) dialog.current.scrollTop = 0;
  }

  return <dialog {...dialogBackdrop} ref={dialog} className="surface request-dialog account-settings-dialog" aria-labelledby={titleId}
    onClose={() => { navigate(null); onClose?.(); }}>
    <header className="account-settings-header">
      {panel && <button type="button" className="icon-button" aria-label="К настройкам" onClick={() => navigate(null)}>
        <Icon name="request-back" size={20} monochrome />
      </button>}
      <h2 id={titleId} ref={heading} tabIndex={-1}>{panel ? panels[panel].title : "Настройки"}</h2>
      <button type="button" className="text-action" onClick={() => dialog.current?.close()}>Закрыть</button>
    </header>
    {!panel ? <div className="account-settings-menu">
      {(staff ? ["theme"] as const : ["theme", "password", "notifications"] as const).map(key =>
        <button key={key} type="button" className="menu-link" onClick={() => navigate(key)}>
          <Icon name={panels[key].icon} size={18} monochrome />
          <span className="menu-label">{panels[key].title}</span>
          {key === "theme" && <CurrentTheme />}
          <Icon name="request-chevron" size={14} monochrome />
        </button>
      )}
    </div> : <div className="settings-content">
      {panel === "theme" ? <ThemeOptions /> :
        loadError ? <div className="detail-stack">
          <p className="form-error" role="alert">Не удалось загрузить настройки.</p>
          <button type="button" className="secondary" onClick={() => { setLoadError(false); setAttempt(value => value + 1); }}>Повторить</button>
        </div> :
        settings === undefined ? <p className="muted" role="status">Загружаем настройки…</p> :
        !settings ? <div className="detail-stack">
          <p className="muted">Сессия истекла. Войдите снова.</p>
          <Link className="secondary request-button" href="/">Войти</Link>
        </div> :
        panel === "notifications" ? <PreferencesForm settings={settings.preferences} /> :
        settings.demo ? <p className="request-callout">{demoPasswordRestriction}</p> :
        <PasswordForm hasStudentNumber={settings.hasStudentNumber} />}
    </div>}
  </dialog>;
}
