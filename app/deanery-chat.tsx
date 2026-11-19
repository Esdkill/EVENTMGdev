"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { assistantConversationLimit, assistantHistoryReplyLimit } from "../lib/assistant-conversation";
import { AssistantAvatar } from "./assistant-avatar";
import { askDeanery } from "./deanery-chat-action";
import { dialogBackdrop } from "./dialog-backdrop";
import { OnceMotion } from "./once-motion";
import { RequestFieldsForm, type RequestDraftEdits } from "./requests/new/request-fields-form";
import { Icon } from "./requests/request-ui";

type Reply = Exclude<Awaited<ReturnType<typeof askDeanery>>, { error: string }>;
type ChatTurn = { id: string; question: string; reply?: Reply; error?: string; draftEdits?: RequestDraftEdits };
type ChatSession = { userId: string; open: boolean; unread: boolean; text: string; turns: ChatTurn[]; lastActivityAt: number | null };
type Conversation = {
  session: ChatSession | null;
  setSession: React.Dispatch<React.SetStateAction<ChatSession | null>>;
};

const ChatContext = createContext<Conversation | null>(null);
const studentQuestions = ["Как заказать справку?", "Где посмотреть дату пересдачи?", "Где посмотреть аудиторию занятия?"];
const staffQuestions = ["Как добавить занятие?", "Как опубликовать новость?", "Где настроить ИИ-помощника?"];
const chatIdleTimeoutMs = 30 * 60 * 1000;

function expireChatSession(session: ChatSession | null, now: number) {
  if (session?.lastActivityAt == null || now - session.lastActivityAt < chatIdleTimeoutMs) return session;
  return { ...session, unread: false, text: "", turns: [], lastActivityAt: null };
}

export function DeaneryChatProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<ChatSession | null>(null);
  useEffect(() => {
    if (pathname === "/" || pathname === "/activate") {
      setSession(null);
    }
  }, [pathname]);
  const lastActivityAt = session?.lastActivityAt;
  useEffect(() => {
    if (lastActivityAt == null) return;
    const expire = () => setSession(current => expireChatSession(current, Date.now()));
    const timer = window.setTimeout(expire, Math.max(0, lastActivityAt + chatIdleTimeoutMs - Date.now()));
    document.addEventListener("visibilitychange", expire);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", expire);
    };
  }, [lastActivityAt]);
  return <ChatContext.Provider value={{ session, setSession }}>{children}</ChatContext.Provider>;
}

export function DeaneryChat({ userId, staff }: { userId: string; staff: boolean }) {
  const context = useContext(ChatContext);
  if (!context) return null;
  const { session, setSession } = context;
  return <ChatWindow session={session?.userId === userId ? session : null} userId={userId} staff={staff} setSession={setSession} />;
}

function ChatWindow({ session, setSession, userId, staff }: {
  session: ChatSession | null; setSession: Conversation["setSession"]; userId: string; staff: boolean;
}) {
  const launcher = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const [launcherNudge, setLauncherNudge] = useState(0);
  const open = session?.open ?? false;
  const unread = session?.unread ?? false;
  const launcherLabel = open ? "Свернуть помощника" : unread ? "Спросить деканат · есть новый ответ" : "Спросить деканат";
  const last = session?.turns.at(-1);
  const lastReply = last?.reply;
  const pending = Boolean(last && !last.reply && !last.error);

  useEffect(() => {
    const window = dialog.current;
    if (!window) return;
    if (!open) {
      if (window.open) {
        window.close();
        launcher.current?.focus();
      }
      return;
    }
    const mobile = matchMedia("(max-width: 999px)");
    function placeWindow() {
      if (!window) return;
      if (window.open && window.matches(":modal") !== mobile.matches) window.close();
      if (!window.open) {
        if (mobile.matches) window.showModal();
        else window.show();
      }
      title.current?.focus();
    }
    placeWindow();
    mobile.addEventListener("change", placeWindow);
    return () => mobile.removeEventListener("change", placeWindow);
  }, [open]);

  useEffect(() => {
    if (!open || !log.current) return;
    const draft = lastReply?.draft && log.current.querySelector(".deanery-chat-turn:last-child .deanery-chat-reply");
    if (draft instanceof HTMLElement) log.current.scrollTop += draft.getBoundingClientRect().top - log.current.getBoundingClientRect().top - 12;
    else log.current.scrollTop = log.current.scrollHeight;
  }, [open, last?.id, last?.error, lastReply]);

  useEffect(() => {
    const button = launcher.current;
    if (!button || !launcherNudge || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = button.animate([
      { transform: "translate(0, 0) rotate(0)" },
      { transform: "translate(-2px, -6px) rotate(-5deg)", offset: 0.24 },
      { transform: "translate(2px, -3px) rotate(4deg)", offset: 0.43 },
      { transform: "translate(-1px, 0) rotate(-2deg)", offset: 0.61 },
      { transform: "translate(0, 0) rotate(0)" },
    ], { duration: 650, easing: "ease-in-out" });
    return () => animation.cancel();
  }, [launcherNudge]);

  useEffect(() => {
    if (lastReply) setLauncherNudge(value => value + 1);
  }, [lastReply]);

  function toggle() {
    setLauncherNudge(value => value + 1);
    setSession(current => current?.userId === userId
      ? { ...current, open: !current.open, unread: false }
      : { userId, open: true, unread: false, text: "", turns: [], lastActivityAt: null });
  }

  function minimize() {
    setSession(current => current?.userId === userId ? { ...current, open: false } : current);
  }

  async function send(text: string) {
    const question = text.trim();
    const now = Date.now();
    const activeSession = expireChatSession(session, now);
    if (!activeSession || (pending && activeSession === session) || !question) return;
    const existing = (last?.error && last.question === question ? activeSession.turns.slice(0, -1) : activeSession.turns)
      .slice(1 - assistantConversationLimit);
    const turn: ChatTurn = { id: crypto.randomUUID(), question };
    setSession({ ...activeSession, text: "", turns: [...existing, turn], lastActivityAt: now });
    const history = existing.flatMap(previous => previous.reply
      ? [{ question: previous.question, reply: previous.reply.text.slice(0, assistantHistoryReplyLimit) }]
      : []);
    const result = await askDeanery(question, history)
      .catch(() => ({ error: "Не удалось отправить вопрос. Проверьте подключение и повторите." }));
    const receivedAt = Date.now();
    setSession(current => {
      if (current?.userId !== userId || current.turns.at(-1) !== turn) return current;
      const active = expireChatSession(current, receivedAt);
      if (active !== current) return active;
      const answer = "error" in result ? { ...turn, error: result.error } : { ...turn, reply: result };
      return { ...current, unread: !current.open && "reply" in answer, turns: [...current.turns.slice(0, -1), answer],
        lastActivityAt: "reply" in answer ? receivedAt : current.lastActivityAt };
    });
  }

  function editDraft(turnId: string, patch: RequestDraftEdits) {
    const editedAt = Date.now();
    setSession(current => {
      const active = expireChatSession(current, editedAt);
      if (active?.userId !== userId || !active.turns.some(turn => turn.id === turnId && turn.reply?.draft)) return active;
      return {
        ...active,
        lastActivityAt: editedAt,
        turns: active.turns.map(turn => turn.id === turnId ? {
          ...turn, draftEdits: { ...turn.draftEdits, ...patch },
        } : turn),
      };
    });
  }

  function onDraftSent(turnId: string, requestId: string) {
    setSession(current => current?.userId === userId ? {
      ...current,
      lastActivityAt: Date.now(),
      turns: current.turns.map(turn => turn.id === turnId ? {
        ...turn, draftEdits: undefined, reply: { text: "Заявка отправлена. Статус можно посмотреть в её карточке.",
          link: { href: `/requests/${requestId}`, label: "Открыть заявку" } },
      } : turn),
    } : current);
  }

  return <aside className="deanery-chat" aria-label="Помощник деканата">
    {session && <dialog ref={dialog} className="deanery-chat-window surface" id="deanery-chat-window" aria-labelledby="deanery-chat-title"
      onCancel={event => { event.preventDefault(); minimize(); }}
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); minimize(); }
      }}
      onPointerDown={dialogBackdrop.onPointerDown}
      onClick={event => dialogBackdrop.onClick(event, minimize)}>
      <header className="deanery-chat-header">
        <h2 id="deanery-chat-title" ref={title} tabIndex={-1}>Спросить деканат</h2>
        <button type="button" className="icon-button" aria-label="Свернуть чат" title="Свернуть чат" onClick={minimize}>
          <Icon name="request-minus" size={20} monochrome />
        </button>
      </header>
      <div ref={log} className="deanery-chat-log" role="log" aria-live="polite">
        {!session?.turns.length && <>
          <div className="deanery-chat-reply">
            <div className="deanery-chat-sender"><strong>ИИ-помощник деканата</strong><Icon name="assistant-robot" size={18} monochrome /></div>
            <p>{staff ? "Помогу найти нужный раздел и разобраться с работой кабинета." : "Помогу разобраться с учёбой, документами и расписанием. Что вас интересует?"}</p>
          </div>
          <div className="deanery-chat-suggestions">
            {(staff ? staffQuestions : studentQuestions).map(question => <button type="button" className="secondary" key={question} onClick={() => send(question)}>{question}</button>)}
          </div>
        </>}
        {session?.turns.map(turn => <div className="deanery-chat-turn" key={turn.id}>
          <p className="deanery-chat-question">{turn.question}</p>
          {turn.reply && <div className="deanery-chat-reply">
            <div className="deanery-chat-sender"><strong>ИИ-помощник деканата</strong><Icon name="assistant-robot" size={18} monochrome /></div>
            {!turn.reply.draft && <p>{turn.reply.text}</p>}
            {turn.reply.source && <a className="deanery-chat-source" href={turn.reply.source.url} target="_blank" rel="noopener noreferrer">
              {turn.reply.source.title} · {turn.reply.source.section}
            </a>}
            {turn.reply.link && <Link href={turn.reply.link.href} className="secondary request-button" onNavigate={minimize}>{turn.reply.link.label}</Link>}
            {turn.reply.draft && <div className="deanery-chat-draft">
              <RequestFieldsForm submissionKey={turn.reply.draft.submissionKey} source={turn.reply.draft}
                draftEdits={turn.draftEdits} onDraftEdit={patch => editDraft(turn.id, patch)}
                onSent={id => onDraftSent(turn.id, id)} />
            </div>}
          </div>}
          {turn.error && <div className="deanery-chat-reply">
            <p className="form-error" role="status">{turn.error}</p>
            {turn === last && <button type="button" className="secondary" onClick={() => send(turn.question)}>Повторить</button>}
          </div>}
          {!turn.reply && !turn.error && <p className="muted">Готовим ответ…</p>}
        </div>)}
      </div>
      <form className="deanery-chat-composer request-form" onSubmit={event => { event.preventDefault(); if (session) void send(session.text); }}>
        <p className="muted" id="deanery-chat-hint">Важное уточняйте в деканате. Вводите вопросы без персональных данных.</p>
        <div className="deanery-chat-input">
          <input aria-label="Ваш вопрос" aria-describedby="deanery-chat-hint" placeholder="Напишите вопрос" maxLength={1000} value={session?.text ?? ""}
            onChange={event => {
              const text = event.currentTarget.value;
              setSession(current => current?.userId === userId ? { ...current, text } : current);
            }} />
          <button type="submit" className="primary icon-button" aria-label="Отправить вопрос" disabled={pending || !session?.text.trim()}>
            <Icon name="home-arrow-up" size={19} monochrome />
          </button>
        </div>
      </form>
    </dialog>}
    <button ref={launcher} type="button" className="deanery-chat-launcher" aria-label={launcherLabel}
      title={launcherLabel} aria-expanded={open} aria-controls={session ? "deanery-chat-window" : undefined} onClick={toggle}>
      <AssistantAvatar wink reactOnHover />
      {!session && <OnceMotion name="assistant-launcher" className="deanery-chat-first-nudge" />}
      {unread && <span className="deanery-chat-unread" aria-hidden="true" />}
    </button>
    <span className="deanery-chat-announcement" role="status">{unread ? "Новый ответ помощника деканата." : ""}</span>
  </aside>;
}
