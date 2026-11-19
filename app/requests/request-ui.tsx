import Link from "next/link";
import Image from "next/image";
import { statusLabels } from "../../lib/request-fields";
import type { RequestStatus } from "../../generated/prisma/client";
import { nameParts, type StoredName } from "../../lib/person-name";

export function Icon({ name, size = 18, monochrome = false }: { name: string; size?: number; monochrome?: boolean }) {
  if (monochrome) {
    return <span aria-hidden="true" className="request-icon-monochrome"
      style={{ width: size, height: size, maskImage: `url("/design/${name}.svg")` }} />;
  }
  return <Image className="request-icon" src={`/design/${name}.svg`} width={size} height={size} alt="" />;
}

export function RequestHeader({ title, subtitle, back, staff = false, staffName, end }: {
  title: string;
  subtitle?: string;
  back?: string;
  staff?: boolean;
  staffName?: string;
  end?: React.ReactNode;
}) {
  return (
    <header className="request-header">
      {back
        ? <Link className="icon-button request-back" href={back} aria-label="Назад"><Icon name="request-back" size={20} monochrome /></Link>
        : <span className="request-header-brand"><Icon name="deanery" size={36} monochrome /></span>}
      <div className="request-header-copy"><h1>{title}</h1>{staffName
        ? <p className="muted"><span className="nav-label-mobile">{shortName(staffName)}</span><span className="nav-label-desktop">{staffName} · специалист деканата</span></p>
        : subtitle && <p className="muted">{subtitle}</p>}</div>
      {end !== undefined ? end : (staff
        ? <span className="request-badge">Сотрудник</span>
        : !back && <Link className="icon-button request-help" href="/help" aria-label="Помощь"><Icon name="help" size={19} monochrome /></Link>)}
    </header>
  );
}

export function shortName(name: string) {
  const { firstName, lastName } = nameParts(name);
  return [firstName, lastName].filter(Boolean).join(" ");
}

export function Initials({ name, stored, src }: { name: string; stored?: StoredName | null; src?: string }) {
  const { firstName, lastName } = nameParts(name, stored);
  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  return <span className="initials" aria-hidden="true">{src ? <Image className="user-avatar-image" src={src} alt="" width={96} height={96} unoptimized /> : initials}</span>;
}

export function Badge({ status, staff = false }: { status: RequestStatus; staff?: boolean }) {
  return <span className={`request-badge status-${status.toLowerCase()}`}>{!staff && status === "NEW" ? "Подана" : statusLabels[status]}</span>;
}

export function ProjectLabel() {
  return <footer className="project-label">Конкурсный проект</footer>;
}

export function CabinetState({ icon, iconEffect, title, description, action, tone = "neutral", role }: {
  icon: string;
  iconEffect?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "neutral" | "success" | "error";
  role?: "alert";
}) {
  return <section className={`surface cabinet-state cabinet-state-${tone}`} role={role}>
    <span className="cabinet-state-icon"><Icon name={icon} size={22} monochrome />{iconEffect}</span>
    <div className="cabinet-state-copy">
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
    </div>
    {action && <div className="cabinet-state-action">{action}</div>}
  </section>;
}

export function dateLabel(date: Date, withTime = false, withYear = true) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}), timeZone: "Europe/Moscow",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

const requestSteps: readonly RequestStatus[] = ["NEW", "IN_PROGRESS", "READY", "ISSUED"];
const staffStatusIcons: Record<RequestStatus, string> = {
  NEW: "request-file",
  IN_PROGRESS: "request-current",
  READY: "request-done",
  ISSUED: "request-check",
  REJECTED: "request-minus",
  CANCELLED: "request-minus",
};
const stepDescriptions: Partial<Record<RequestStatus, string>> = {
  NEW: "Заявка зарегистрирована",
  IN_PROGRESS: "Готовим ваш документ",
  READY: "Документ подготовлен",
  ISSUED: "Документ выдан",
};
const pendingDescriptions: Partial<Record<RequestStatus, string>> = {
  IN_PROGRESS: "Деканат начнёт обработку",
  READY: "Пришлём уведомление",
  ISSUED: "По готовности документа",
};

export function Timeline({ events, status, dueOn, staff = false }: {
  events: { id: string; toStatus: RequestStatus; createdAt: Date; reason: string | null }[];
  status: RequestStatus;
  dueOn: Date;
  staff?: boolean;
}) {
  const deadline = dateLabel(dueOn, false, false);
  if (staff) {
    return <section className="surface request-history staff-timeline">
      <h2>История статусов</h2>
      {events.length ? <ol>
        {events.map((event, index) => {
          const current = index === events.length - 1;
          return <li key={event.id} className={current ? "current-event" : undefined} aria-current={current ? "step" : undefined}>
            <span className={`staff-timeline-marker status-${event.toStatus.toLowerCase()}`}>
              <Icon name={staffStatusIcons[event.toStatus]} size={14} monochrome />
            </span>
            <div>
              <div className="request-row">
                <Badge status={event.toStatus} staff />
                <time className="muted" dateTime={event.createdAt.toISOString()}>{dateLabel(event.createdAt, true, false)}</time>
              </div>
              {event.reason && <p className="muted staff-timeline-reason">{event.reason}</p>}
            </div>
          </li>;
        })}
      </ol> : <p className="muted">Пока нет записей.</p>}
      {(status === "NEW" || status === "IN_PROGRESS") && <p className="staff-timeline-deadline">
        <Icon name="request-calendar" size={16} monochrome />
        Подготовить документ до {deadline}
      </p>}
    </section>;
  }

  const step = requestSteps.indexOf(status);
  const remaining = step < 0 ? [] : requestSteps.slice(step + 1);
  return (
    <section className="surface request-history">
      <div className="request-row action-row"><h2>История статусов</h2><Badge status={status} /></div>
      <ol>
        {events.map((event, index) => (
          <li key={event.id} className={index === events.length - 1 ? "current-event" : undefined}>
            <span className="timeline-icon"><Icon name={index === events.length - 1 ? "request-current" : "request-check"} size={14} monochrome /></span>
            <div>
              <div className="request-row">
                <strong>{event.toStatus === "NEW" ? "Подана" : statusLabels[event.toStatus]}</strong>
                <time className="muted" dateTime={event.createdAt.toISOString()}>{dateLabel(event.createdAt, true, false)}</time>
              </div>
              {(event.reason || stepDescriptions[event.toStatus]) && <p className="muted">{event.reason || stepDescriptions[event.toStatus]}</p>}
            </div>
          </li>
        ))}
        {remaining.map(value => <li key={value} className="future-event">
          <span className="timeline-icon" aria-hidden="true" />
          <div>
            <div className="request-row">
              <strong>{statusLabels[value]}</strong><span className="muted">{value === "READY" ? `Ожидаем ${deadline}` : "Ожидается"}</span>
            </div>
            <p className="muted">{pendingDescriptions[value]}</p>
          </div>
        </li>)}
      </ol>
    </section>
  );
}

export function RequestMessages({ messages, children }: {
  messages: { id: string; text: string; createdAt: Date; author: { name: string } }[];
  children?: React.ReactNode;
}) {
  return (
    <section id="request-messages" className="surface request-summary" aria-labelledby="request-messages-title">
      <h2 id="request-messages-title">Сообщения деканата</h2>
      {messages.length ? (
        <ul className="request-list request-messages">
          {messages.map(message => (
            <li key={message.id}>
              <strong>{message.author.name}</strong>
              <time className="muted" dateTime={message.createdAt.toISOString()}>{dateLabel(message.createdAt, true)}</time>
              <p>{message.text}</p>
            </li>
          ))}
        </ul>
      ) : <p className="muted">Сообщений пока нет.</p>}
      {children}
    </section>
  );
}
