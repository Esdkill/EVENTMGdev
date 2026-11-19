"use client";

import Image from "next/image";
import { useState } from "react";
import { OnceMotion } from "./once-motion";

const reactions = ["blink", "wink"] as const;

export function AssistantAvatar({ wink = false, reactOnHover = false }: { wink?: boolean; reactOnHover?: boolean }) {
  const [hoverCount, setHoverCount] = useState(0);
  const reaction = hoverCount ? reactions[(hoverCount - 1) % reactions.length] : null;

  return <span className="assistant-avatar" aria-hidden="true"
    onPointerEnter={reactOnHover ? event => {
      if (event.pointerType === "mouse" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setHoverCount(count => count + 1);
      }
    } : undefined}>
    <span>
      <Image src="/design/home-robot.png" width={61} height={61} alt="" loading="eager" />
      {wink && <OnceMotion name="assistant-open" className="assistant-wink" />}
      {reaction && <span key={hoverCount} className="assistant-hover-face" data-reaction={reaction}>
        <span className="assistant-face-eye assistant-face-eye-left" />
        <span className="assistant-face-eye assistant-face-eye-right" />
      </span>}
    </span>
  </span>;
}
