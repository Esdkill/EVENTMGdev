"use client";

import { useSyncExternalStore } from "react";

const dayFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit",
});
const labelFormat = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow", weekday: "long", year: "numeric", month: "long", day: "numeric",
});

function getDay() {
  return dayFormat.format(Date.now());
}

function subscribe(onDateChange: () => void) {
  let timer: number;
  function scheduleUpdate() {
    timer = window.setTimeout(update, 60_000 - Date.now() % 60_000);
  }
  function update() {
    window.clearTimeout(timer);
    onDateChange();
    scheduleUpdate();
  }
  scheduleUpdate();
  window.addEventListener("focus", update);
  document.addEventListener("visibilitychange", update);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("focus", update);
    document.removeEventListener("visibilitychange", update);
  };
}

export function CabinetDate({ initialTime }: { initialTime: number }) {
  const day = useSyncExternalStore(subscribe, getDay, () => dayFormat.format(initialTime));
  const label = labelFormat.format(new Date(day + "T12:00:00Z")).replace(/ г\.$/, "");
  return <time className="muted cabinet-current-date" dateTime={day}>{label.charAt(0).toUpperCase() + label.slice(1)}</time>;
}
