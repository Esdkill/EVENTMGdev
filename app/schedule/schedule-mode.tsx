"use client";

import Link from "next/link";
import { useOptimistic, startTransition } from "react";

export function ScheduleMode({ isWeek, dayHref, weekHref }: { isWeek: boolean; dayHref: string; weekHref: string }) {
  const [week, selectWeek] = useOptimistic(isWeek);
  return <nav className="schedule-view schedule-mode" aria-label="Режим расписания" data-week={week}>
    <Link href={dayHref} aria-current={!isWeek ? "page" : undefined} onNavigate={() => startTransition(() => selectWeek(false))}>День</Link>
    <Link href={weekHref} aria-current={isWeek ? "page" : undefined} onNavigate={() => startTransition(() => selectWeek(true))}>Неделя</Link>
  </nav>;
}
