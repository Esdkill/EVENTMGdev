"use client";

import { useCallback, useEffect, useRef } from "react";

const sprite = [
  "000000000000",
  "000003300000",
  "000003300000",
  "000001100000",
  "002222222200",
  "023111111320",
  "023141141320",
  "022111111220",
  "022114411220",
  "002222222200",
  "000003300000",
  "003222222300",
  "003224422300",
  "000222222000",
  "000330033000",
  "000000000000",
] as const;

const colors = ["", "#171b32", "#fff0dc", "#fa9d31", "#71e5ff"];
const chirps = ["Бип!", "Вжух!", "Пип!", "Топ-топ!", "Тук!", "Буп!"] as const;
const tapChirps = ["Буп!", "Приветик!", "Бип-бип!", "Лапку?"] as const;

export function PixelRobot() {
  const runner = useRef<HTMLButtonElement>(null);
  const figure = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const leftStepCanvas = useRef<HTMLCanvasElement>(null);
  const rightStepCanvas = useRef<HTMLCanvasElement>(null);
  const blinkCanvas = useRef<HTMLCanvasElement>(null);
  const speech = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const tapCount = useRef(0);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const say = useCallback((message: string, manual = false) => {
    const track = runner.current;
    if (!track || !speech.current) return;
    clearTimeout(speechTimer.current);
    speech.current.textContent = message;
    const bounds = track.getBoundingClientRect();
    const center = (bounds.left + bounds.right) / 2;
    const margin = speech.current.textContent.length * 3 + 14;
    track.dataset.bubbleSide = center < margin ? "left" :
      center > document.documentElement.clientWidth - margin ? "right" : "center";
    track.dataset.speaking = manual ? "manual" : "automatic";
    if (manual && status.current) status.current.textContent = message;
    speechTimer.current = setTimeout(() => { delete track.dataset.speaking; }, manual ? 2200 : 1800);
  }, []);

  useEffect(() => {
    for (const frame of [canvas.current, leftStepCanvas.current, rightStepCanvas.current, blinkCanvas.current]) {
      const drawing = frame?.getContext("2d");
      if (!drawing) continue;
      sprite.forEach((row, y) => {
        let pixels: string = row;
        if (frame === leftStepCanvas.current && y === 14) pixels = "003300030000";
        if (frame === leftStepCanvas.current && y === 15) pixels = "000000030000";
        if (frame === rightStepCanvas.current && y === 14) pixels = "000030003300";
        if (frame === rightStepCanvas.current && y === 15) pixels = "000030000000";
        if (frame === blinkCanvas.current && y === 6) pixels = "023111111320";
        if (frame === blinkCanvas.current && y === 7) pixels = "022441144220";
        [...pixels].forEach((pixel, x) => {
          if (pixel === "0") return;
          drawing.fillStyle = colors[Number(pixel)];
          drawing.fillRect(x + 2, y, 1, 1);
        });
      });
    }
  }, []);

  useEffect(() => {
    const element = runner.current;
    const rail = element?.parentElement;
    const spriteFigure = figure.current;
    if (!element || !rail || !spriteFigure) return;

    const track = element;
    const area = rail;
    const rotatingFigure = spriteFigure;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 1000px)");
    const canHover = matchMedia("(hover: hover)");
    const positionKey = "deanery-robot-position";
    let progress = 0;
    try { progress = Number(sessionStorage.getItem(positionKey)) === 1 ? 1 : 0; } catch { /* Storage is optional. */ }
    let animation: Animation | undefined;
    let rotation: Animation | undefined;
    const phraseKey = "deanery-robot-phrase";
    let phrase = 0;
    try { phrase = Number(sessionStorage.getItem(phraseKey)) || 0; } catch { /* Storage is optional. */ }

    function chirp() {
      if (reducedMotion.matches || document.hidden || track.dataset.running || track.dataset.speaking === "manual") return;
      say(chirps[phrase % chirps.length]);
      phrase += 1;
      try { sessionStorage.setItem(phraseKey, String(phrase)); } catch { /* The message is still visible. */ }
    }

    function mobileTransform(position: number) {
      const extent = Math.max(0, area.clientWidth - track.offsetWidth - 16);
      return `translateX(${extent * position + 8}px)`;
    }

    const inset = 11;
    const transform = (x: number, y: number) => `translate(${x}px, ${y}px)`;

    function place() {
      track.style.transform = desktop.matches ? transform(inset, inset) : mobileTransform(progress);
      rotatingFigure.style.rotate = desktop.matches ? "180deg" : "0deg";
      track.dataset.positioned = "true";
    }

    function reposition() {
      animation?.cancel();
      rotation?.cancel();
      delete track.dataset.running;
      place();
    }

    function run() {
      if (reducedMotion.matches || document.hidden || track.dataset.running || track.dataset.speaking === "manual" ||
          track.matches(":focus-visible") || (canHover.matches && track.matches(":hover"))) return;

      let frames: Keyframe[];
      let duration: number;
      if (desktop.matches) {
        const width = Math.max(1, area.clientWidth - inset * 2);
        const height = Math.max(1, area.clientHeight - inset * 2);
        const distance = width + height * 2;
        const turnRight = width / distance;
        const jumpLeft = (width + height) / distance;
        frames = [
          { transform: transform(inset, inset), offset: 0 },
          { transform: transform(inset + width, inset), offset: turnRight },
          { transform: transform(inset + width, inset + height), offset: jumpLeft },
          { transform: transform(inset, inset + height), offset: jumpLeft },
          { transform: transform(inset, inset), offset: 1 },
        ];
        duration = distance / 36 * 1000;
        rotation = rotatingFigure.animate([
          { rotate: "180deg", offset: 0, easing: "steps(1, end)" },
          { rotate: "-90deg", offset: turnRight, easing: "steps(1, end)" },
          { rotate: "90deg", offset: jumpLeft, easing: "steps(1, end)" },
          { rotate: "180deg", offset: 1 },
        ], { duration });
      } else {
        const from = mobileTransform(progress);
        progress = progress === 1 ? 0 : 1;
        frames = [{ transform: from }, { transform: mobileTransform(progress) }];
        duration = Math.max(0, area.clientWidth - track.offsetWidth - 16) / 29 * 1000;
        try { sessionStorage.setItem(positionKey, String(progress)); } catch { /* The motion still works. */ }
      }
      place();
      track.dataset.running = "true";
      animation = track.animate(frames, { duration: Math.max(1000, duration), easing: "linear" });
      animation.addEventListener("finish", () => {
        delete track.dataset.running;
        chirp();
      }, { once: true });
    }

    place();
    const greeting = setTimeout(run, desktop.matches ? 900 : 2100);
    const idleChatter = setInterval(run, 16000);
    const resize = new ResizeObserver(reposition);
    resize.observe(area);
    reducedMotion.addEventListener("change", reposition);
    return () => {
      animation?.cancel();
      rotation?.cancel();
      resize.disconnect();
      clearTimeout(speechTimer.current);
      clearTimeout(greeting);
      clearInterval(idleChatter);
      reducedMotion.removeEventListener("change", reposition);
    };
  }, [say]);

  function onTap() {
    say(tapChirps[tapCount.current % tapChirps.length], true);
    tapCount.current += 1;
  }

  return <>
    <button type="button" ref={runner} className="pixel-robot-runner"
      aria-label="Поговорить с мини-роботом" onClick={onTap}>
      <span ref={figure} className="pixel-robot-figure" aria-hidden="true">
        <canvas ref={canvas} className="pixel-robot-base" width={16} height={16} />
        <canvas ref={leftStepCanvas} className="pixel-robot-stride pixel-robot-left-step" width={16} height={16} />
        <canvas ref={rightStepCanvas} className="pixel-robot-stride pixel-robot-right-step" width={16} height={16} />
        <canvas ref={blinkCanvas} className="pixel-robot-blink" width={16} height={16} />
      </span>
      <span ref={speech} className="pixel-robot-speech" aria-hidden="true" />
    </button>
    <span ref={status} role="status" className="pixel-robot-status" />
  </>;
}
