"use client";

import { useEffect, useRef } from "react";

export function OnceMotion({ name, className }: { name: string; className: string }) {
  const decoration = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = decoration.current;
    if (!element || element.dataset.play || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    try {
      const key = `deanery-motion:${name}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // The decoration can still play when browser storage is unavailable.
    }
    element.dataset.play = "true";
  }, [name]);

  return <span ref={decoration} className={className} aria-hidden="true" />;
}
