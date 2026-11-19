import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import "./cabinet.css";
import "./system-states.css";
import "./deanery-chat.css";
import "./section-loading.css";
import "./visual-effects.css";
import "./liquid-glass.css";
import { GlassRefraction } from "./glass-refraction";
import { DeaneryChatProvider } from "./deanery-chat";
import { OfflineCabinet } from "./offline-cabinet";

export const metadata: Metadata = {
  title: "Цифровой деканат",
  description: "Конкурсный проект личного кабинета студента.",
};

export const viewport: Viewport = { viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: 'try{var t=localStorage.getItem("deanery-theme");if(t==="light"||t==="dark"||t==="system")document.documentElement.dataset.theme=t}catch(e){}' }} /></head>
    <body><GlassRefraction /><OfflineCabinet><DeaneryChatProvider>{children}</DeaneryChatProvider></OfflineCabinet></body>
  </html>;
}
