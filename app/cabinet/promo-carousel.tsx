"use client";

import { useEffect, useState } from "react";
import { promoImageUrl } from "../../lib/promo-banners";
import { Icon } from "../requests/request-ui";
import "./promo.css";

export function PromoCarousel({ items, autoPlay }: { items: { id: string; title: string; href: string }[]; autoPlay: boolean }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [focused, setFocused] = useState(false);
  const activeIndex = index % items.length;

  useEffect(() => {
    if (!autoPlay) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPlaying(!media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [autoPlay]);

  useEffect(() => {
    if (items.length < 2 || !playing || interacting || focused) return;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % items.length), 6500);
    return () => window.clearInterval(timer);
  }, [items.length, playing, interacting, focused]);

  function select(next: number) {
    setPlaying(false);
    setIndex((next + items.length) % items.length);
  }

  if (!items.length) return null;
  return <section className="promo-carousel" aria-label="Баннеры" aria-roledescription="слайд-шоу"
    onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
    onFocus={() => setFocused(true)} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}>
    {items.map((slide, position) => <a key={slide.id} className="promo-slide" href={slide.href}
      target="_blank" rel="noopener noreferrer" hidden={position !== activeIndex}>
      <img src={promoImageUrl(slide.id)} alt={slide.title} loading="lazy" decoding="async" />
      <span aria-hidden="true"><span>{slide.title}</span><Icon name="home-arrow-up" size={16} monochrome /></span>
    </a>)}
    {items.length > 1 && <div className="promo-controls">
      <button type="button" className="icon-button" aria-label="Предыдущий баннер" onClick={() => select(index - 1)}>
        <Icon name="request-back" size={17} monochrome />
      </button>
      <span aria-live={playing && !focused && !interacting ? "off" : "polite"}>{activeIndex + 1} из {items.length}</span>
      <button type="button" className="icon-button" aria-label="Следующий баннер" onClick={() => select(index + 1)}>
        <Icon name="enter" size={17} monochrome />
      </button>
      {autoPlay && <button type="button" className="text-action" onClick={() => setPlaying(current => !current)}>{playing ? "Пауза" : "Автопоказ"}</button>}
    </div>}
  </section>;
}
