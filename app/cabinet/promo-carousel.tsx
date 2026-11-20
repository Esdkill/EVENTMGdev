"use client";

import { useEffect, useRef, useState } from "react";
import { promoImageUrl } from "../../lib/promo-banners";
import { Icon } from "../requests/request-ui";
import "./promo.css";

const slideDurationMs = 6500;

export function PromoCarousel({ items, autoPlay }: { items: { id: string; title: string; href: string | null }[]; autoPlay: boolean }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [focused, setFocused] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const activeIndex = index % items.length;
  const autoplayActive = playing && !interacting && !focused;

  useEffect(() => {
    if (!autoPlay) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPlaying(!media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [autoPlay]);

  function select(next: number, keepAutoplay = false) {
    if (!keepAutoplay) setPlaying(false);
    setIndex((next + items.length) % items.length);
  }

  if (!items.length) return null;
  return <section className="promo-carousel" aria-label="Баннеры" aria-roledescription="слайд-шоу"
    onTouchStart={event => {
      const touch = event.touches.length === 1 ? event.touches[0] : undefined;
      touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    }}
    onTouchCancel={() => { touchStart.current = null; }}
    onTouchEnd={event => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start || items.length < 2 || event.touches.length || !event.changedTouches.length) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
      if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      suppressClickUntil.current = Date.now() + 350;
      select(activeIndex + (dx < 0 ? 1 : -1), true);
    }}
    onClickCapture={event => {
      if (event.detail && Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); }
    }}
    onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
    onFocus={() => setFocused(true)} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}>
    {items.map((slide, position) => {
      const Slide = slide.href ? "a" : "div";
      const link = slide.href ? { href: slide.href, target: "_blank", rel: "noopener noreferrer" } : {};
      return <Slide key={slide.id} className="promo-slide" {...link} hidden={position !== activeIndex}>
        <img src={promoImageUrl(slide.id)} alt={slide.title} loading="lazy" decoding="async" />
      </Slide>;
    })}
    {autoPlay && items.length > 1 && <div className="promo-progress" aria-hidden="true">
      {items.map((slide, position) => <span key={slide.id} className="promo-progress-segment"
        data-active={position === activeIndex}>
        {position === activeIndex && <span className="promo-progress-fill"
          style={{ animationDuration: `${slideDurationMs}ms`, animationPlayState: autoplayActive ? "running" : "paused" }}
          onAnimationEnd={() => setIndex(current => (current + 1) % items.length)} />}
      </span>)}
    </div>}
    {items.length > 1 && <div className="promo-controls">
      <button type="button" className="icon-button" aria-label="Предыдущий баннер" onClick={() => select(index - 1)}>
        <Icon name="request-back" size={17} monochrome />
      </button>
      <span aria-live={autoplayActive ? "off" : "polite"}>{activeIndex + 1} из {items.length}</span>
      <button type="button" className="icon-button" aria-label="Следующий баннер" onClick={() => select(index + 1)}>
        <Icon name="enter" size={17} monochrome />
      </button>
      {autoPlay && <button type="button" className="text-action" onClick={() => setPlaying(current => !current)}>{playing ? "Пауза" : "Автопоказ"}</button>}
    </div>}
  </section>;
}
