"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "../requests/request-ui";

const choices = [["light", "Светлая"], ["dark", "Тёмная"], ["system", "Как в системе"]] as const;
const storageKey = "deanery-theme";
const systemDark = "(prefers-color-scheme: dark)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(systemDark);
  media.addEventListener("change", callback);
  window.addEventListener("deanery-theme", callback);
  window.addEventListener("storage", callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener("deanery-theme", callback);
    window.removeEventListener("storage", callback);
  };
}

function setTheme(value: typeof choices[number][0]) {
  try { localStorage.setItem(storageKey, value); } catch {}
  document.documentElement.dataset.theme = value;
  window.dispatchEvent(new Event("deanery-theme"));
}

export function ThemeOptions() {
  const theme = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme || "system", () => "system");
  const current = choices.find(([value]) => value === theme)?.[1];
  return <section className="surface request-summary">
    <h2>Внешний вид</h2>
    <div className="theme-options">
      {choices.map(([value, label]) => <button key={value} type="button" className="menu-link" aria-pressed={theme === value} onClick={() => setTheme(value)}>
        <Icon name={value === "system" ? "account-settings" : "home-sun"} size={20} monochrome />
        <span className="menu-label">{label}</span><Icon name="request-chevron" size={14} monochrome />
      </button>)}
    </div>
    {current && <p role="status"><span className="request-badge">Выбрано: {current.toLowerCase()}</span></p>}
    {theme === "system" && <p className="muted">Автоматически подстраивается под настройки устройства.</p>}
  </section>;
}

export function CurrentTheme() {
  const theme = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme || "system", () => "system");
  return <small className="muted">{choices.find(([value]) => value === theme)?.[1] ?? "Как в системе"}</small>;
}
