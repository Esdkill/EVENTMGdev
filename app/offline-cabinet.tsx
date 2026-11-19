"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { OfflineNotice, useOffline } from "./connection";
import { dialogBackdrop } from "./dialog-backdrop";

type Snapshot = { path: string; title: string; content: string[]; capturedAt: number };
type SavedCabinet = { userId: string; pages: Snapshot[] };
const SnapshotContext = createContext<(userId: string, page?: Snapshot) => void>(() => {});
const savedAt = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });

function readablePath(pathname: string) {
  if (pathname === "/requests/new") return false;
  return /^\/(?:cabinet|schedule|grades|requests|notifications|news|profile|help|staff(?:\/(?:schedule|requests))?)$/.test(pathname) ||
    /^\/(?:grades|requests|notifications|staff\/requests)\/[^/]+$/.test(pathname);
}

export function OfflineCabinet({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const offline = useOffline();
  const [saved, setSaved] = useState<SavedCabinet>();
  const [selected, setSelected] = useState<Snapshot>();
  const [unavailable, setUnavailable] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const signedOut = pathname === "/" || pathname === "/activate";
  const pages = signedOut ? undefined : saved?.pages;
  const hasPages = Boolean(pages?.length);

  const remember = useCallback((userId: string, page?: Snapshot) => {
    setSaved(current => {
      if (current?.userId !== userId) return { userId, pages: page ? [page] : [] };
      if (!page) return current;
      return { userId, pages: [page, ...current.pages.filter(entry => entry.path !== page.path)].slice(0, 25) };
    });
  }, []);

  useEffect(() => {
    if (signedOut) {
      setSaved(undefined);
      setSelected(undefined);
    }
  }, [signedOut]);

  useEffect(() => {
    if (!offline || signedOut) dialog.current?.close();
  }, [offline, signedOut]);

  const openPages = useCallback((page?: Snapshot, missing = false) => {
    setSelected(page);
    setUnavailable(missing);
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  useEffect(() => {
    if (!offline || !pages?.length) return;
    function openOfflineLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(".cabinet-shell a[href]") : null;
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || !readablePath(url.pathname)) return;
      if (url.pathname + url.search === location.pathname + location.search && url.hash) return;
      event.preventDefault();
      event.stopPropagation();
      const snapshot = pages?.find(page => page.path === url.pathname + (url.search ? "?" + url.searchParams.toString() : ""));
      openPages(snapshot, !snapshot);
    }
    document.addEventListener("click", openOfflineLink, true);
    return () => document.removeEventListener("click", openOfflineLink, true);
  }, [offline, pages, openPages]);

  return <SnapshotContext.Provider value={remember}>
    <OfflineNotice onOpenPages={hasPages ? () => openPages() : undefined} />
    {children}
    <dialog ref={dialog} className="surface request-dialog offline-dialog" aria-labelledby={title}
      onPointerDown={dialogBackdrop.onPointerDown} onClick={dialogBackdrop.onClick}>
      <header className="offline-dialog-header">
        <h2 id={title} ref={heading} tabIndex={-1}>{selected?.title ?? "Открытые страницы"}</h2>
        <button className="secondary" type="button" onClick={() => dialog.current?.close()}>Закрыть</button>
      </header>
      {selected ? <>
        <button className="secondary connection-back" type="button" onClick={() => { setSelected(undefined); heading.current?.focus(); }}>← Все страницы</button>
        <p className="muted">Снимок от {savedAt.format(selected.capturedAt)} · Только просмотр</p>
        <div className="offline-snapshot">{selected.content.map((block, index) => <p key={index}>{block}</p>)}</div>
      </> : <>
        {unavailable && <p role="status">Эта страница ещё не открывалась в этой вкладке. Подключитесь к интернету, чтобы загрузить её.</p>}
        <ul className="offline-list">
          {pages?.map(page => <li key={page.path}>
            <button className="secondary" type="button" onClick={() => { setSelected(page); heading.current?.focus(); }}>
              <span>{page.title}</span><small className="muted">{savedAt.format(page.capturedAt)}</small>
            </button>
          </li>)}
        </ul>
      </>}
    </dialog>
  </SnapshotContext.Provider>;
}

function snapshotBody(main: HTMLElement) {
  const schedule = main.querySelectorAll<HTMLElement>(".schedule-day");
  if (schedule.length) return Array.from(schedule).flatMap(day => {
    const heading = day.querySelector("h2")?.textContent ?? day.querySelector(".schedule-table")?.getAttribute("aria-label");
    const lessons = Array.from(day.querySelectorAll(".lesson-row")).map(lesson => {
      const time = lesson.querySelector(".lesson-time")?.textContent?.trim();
      const subject = lesson.querySelector(".lesson-title strong")?.textContent?.trim();
      const details = Array.from(lesson.querySelectorAll(".lesson-title small, .lesson-location > *, .lesson-status > *"))
        .map(field => field.textContent?.trim()).filter(Boolean);
      return [[time, subject].filter(Boolean).join(" · "), details.join(" · ")].filter(Boolean).join("\n");
    });
    return [heading, ...(lessons.length ? lessons : ["В этот день занятий нет"])].filter((block): block is string => Boolean(block));
  });
  const sections = Array.from(main.children).filter((element): element is HTMLElement => element instanceof HTMLElement &&
    !element.matches("footer, form, dialog, button, [hidden], [aria-hidden='true']"));
  return sections.map(element => element.innerText.trim()).filter(Boolean);
}

export function RememberCabinetPage({ userId }: { userId: string }) {
  const path = usePathname();
  const search = useSearchParams().toString();
  const remember = useContext(SnapshotContext);
  const marker = useRef<HTMLSpanElement>(null);
  const offline = useOffline();

  useEffect(() => {
    remember(userId);
    if (offline || !readablePath(path)) return;
    const frame = requestAnimationFrame(() => {
      const main = marker.current?.parentElement?.querySelector<HTMLElement>(":scope > main");
      const heading = main?.querySelector<HTMLElement>("h1");
      if (!main || !heading?.innerText.trim()) return;
      const detail = main.querySelector<HTMLElement>("h2")?.innerText.trim();
      const route = path + (search ? "?" + search : "");
      const title = /\/(?:grades|requests|notifications)\/[^/]+$/.test(path) && detail
        ? detail : heading.innerText.trim();
      const options = new URLSearchParams(search);
      const date = path === "/schedule" ? options.get("date") : null;
      remember(userId, {
        path: route, title: date ? `${title} · ${date}` : title,
        content: snapshotBody(main), capturedAt: Date.now(),
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [path, search, userId, remember, offline]);

  return <span ref={marker} hidden />;
}
