"use client";

import { useState, useSyncExternalStore } from "react";

const connectionEvent = "deanery-connection";
let requestFailed = false;

function connectionChanged(failed: boolean) {
  requestFailed = failed;
  window.dispatchEvent(new Event(connectionEvent));
}

function subscribe(callback: () => void) {
  const onOnline = () => { requestFailed = false; callback(); };
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", callback);
  window.addEventListener(connectionEvent, callback);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", callback);
    window.removeEventListener(connectionEvent, callback);
  };
}

export function isConnectionError(error: unknown) {
  return !navigator.onLine || (
    error instanceof TypeError && /failed to fetch|networkerror|load failed|network request failed/i.test(error.message)
  );
}

export function showOfflineNotice() {
  connectionChanged(true);
}

export function useOffline() {
  return useSyncExternalStore(subscribe, () => !navigator.onLine || requestFailed, () => false);
}

export function OfflineNotice({ onOpenPages }: { onOpenPages?: () => void }) {
  const offline = useOffline();
  const [checking, setChecking] = useState(false);

  async function retry() {
    setChecking(true);
    try {
      const response = await fetch("/api/connection", {
        method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(4000),
      });
      connectionChanged(!response.ok);
    } catch {
      showOfflineNotice();
    } finally {
      setChecking(false);
    }
  }

  if (!offline) return null;
  return (
    <aside className="connection-banner" aria-label="Состояние сети">
      <div className="connection-content">
        <span className="connection-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h.01M2 8.8a16 16 0 0 1 4.3-2.4M11 5a16 16 0 0 1 11 3.8M5 12.9a11 11 0 0 1 4.2-2.4M15.5 10.8a11 11 0 0 1 3.5 2.1M8.5 16.5a5.5 5.5 0 0 1 7 0M2 2l20 20" />
          </svg>
        </span>
        <div role="status">
          <strong>Нет соединения</strong>
          <p>Заполненные поля останутся в форме.</p>
        </div>
        <div className="connection-actions">
          {onOpenPages && <button className="connection-retry" type="button" onClick={onOpenPages}>Открытые страницы</button>}
          <button className="connection-retry" type="button" disabled={checking} onClick={retry}>
            {checking ? "Проверяем…" : "Повторить"}
          </button>
        </div>
      </div>
    </aside>
  );
}
