"use client";

import { useEffect, useState } from "react";

export function LoginMotion() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: no-preference) and (prefers-contrast: no-preference)");
    const sync = () => setEnabled(preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  return enabled ? <video className="welcome-motion" aria-hidden="true" src="/design/login-motion.mp4" poster="/design/login-motion.jpg"
    preload="none" autoPlay muted playsInline disablePictureInPicture onError={() => setEnabled(false)} /> : null;
}
