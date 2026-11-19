import Link from "next/link";

export function NotificationNavigation({ view }: { view: "all" | "news" }) {
  return <nav className="schedule-view notification-navigation" aria-label="Разделы уведомлений">
    <Link href="/notifications" aria-current={view === "all" ? "page" : undefined}>Все события</Link>
    <Link href="/news" aria-current={view === "news" ? "page" : undefined}>Новости</Link>
  </nav>;
}
