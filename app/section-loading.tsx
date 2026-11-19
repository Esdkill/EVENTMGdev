"use client";

type Shape = "line" | "small" | "title" | "button" | "field" | "textarea" | "badge" | "icon" | "avatar" | "ring" | "meter" | "hint";

function Block({ shape = "line", width }: { shape?: Shape; width?: string }) {
  return <span className={`loading-block loading-${shape}`} style={width ? { width } : undefined} />;
}

function Lines({ widths }: { widths: string[] }) {
  return <div className="loading-lines">{widths.map((width, index) => (
    <Block key={index} shape={index ? "small" : "line"} width={width} />
  ))}</div>;
}

type FieldShape = "field" | "textarea" | "counter" | "delivery";

function FieldControl({ shape }: { shape: FieldShape }) {
  if (shape === "counter") return <div className="loading-counter">
    <Block shape="badge" width="20px" /><Block shape="line" width="18px" /><Block shape="badge" width="20px" />
  </div>;
  if (shape === "delivery") return <div className="loading-pair loading-delivery">
    <Block shape="field" /><Block shape="field" />
  </div>;
  return <Block shape={shape} />;
}

function Fields({ shapes, columns = false }: { shapes: FieldShape[]; columns?: boolean }) {
  return <div className={`loading-fields${columns ? " loading-fields-columns" : ""}`}>
    {shapes.map((shape, index) => (
      <div key={index} className="loading-field-group" data-wide={shape === "textarea" || undefined}>
        <Block shape="small" width={index % 2 ? "5rem" : "6.5rem"} />
        <FieldControl shape={shape} />
      </div>
    ))}
  </div>;
}

function Rows({ count = 3, badges = false, grouped = false }: { count?: number; badges?: boolean; grouped?: boolean }) {
  return <div className={`loading-rows${grouped ? " surface loading-grouped" : ""}`}>
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className={`loading-row${grouped ? "" : " surface"}`}>
        <Block shape="icon" />
        <Lines widths={index % 2 ? ["59%", "38%"] : ["78%", "49%"]} />
        {badges && <Block shape="badge" />}
      </div>
    ))}
  </div>;
}

function CopyCard({ widths = ["64%", "90%", "76%"] }: { widths?: string[] }) {
  return <div className="surface loading-card"><Lines widths={widths} /></div>;
}

function Tabs() {
  return <div className="loading-tabs" data-part="tabs"><Block shape="button" /><Block shape="button" /></div>;
}

function Table({ widths, part }: { widths: string[]; part: "schedule-table" | "request-table" }) {
  return <div className="loading-table surface" data-part={part}>
    {[0, 1, 2, 3].map(row => <div className="loading-table-row" key={row}>
      {widths.map((width, column) => <Block key={column} width={width} shape={row ? "line" : "small"} />)}
    </div>)}
  </div>;
}

function Home() {
  return <>
    <div className="loading-home-greeting"><Lines widths={["min(230px, 86%)", "min(155px, 75%)"]} /><Block shape="avatar" /></div>
    <div className="loading-home-grid">
      <div className="loading-home-day">
        <div className="surface loading-lesson-hero" data-part="next-lesson">
          <Block shape="small" width="8rem" />
          <div className="loading-inline"><Block shape="title" width="4.25rem" /><Lines widths={["75%", "53%"]} /></div>
          <Block shape="small" width="min(9.5rem, 65%)" />
        </div>
        <div className="loading-home-classes"><Block width="8rem" /><Rows grouped count={2} /></div>
      </div>
      <div className="loading-stack">
        <div className="loading-stack" data-part="quick-actions">
          <Block shape="button" />
          <div className="loading-pair"><Block shape="button" /><Block shape="button" /></div>
          <Block shape="button" />
        </div>
        <div className="loading-stack"><Block width="6rem" /><Rows grouped count={2} /></div>
      </div>
    </div>
  </>;
}

function Schedule() {
  const widths = ["74%", "88%", "72%", "58%"];
  return <>
    <div className="loading-schedule-toolbar"><Block shape="button" width="min(13rem, 100%)" /><Tabs /></div>
    <div className="loading-dates" data-part="days">{Array.from({ length: 6 }, (_, index) => <Block key={index} shape="field" />)}</div>
    <div className="surface loading-lessons-mobile" data-part="lesson-cards">
      {[0, 1, 2].map(index => <div className="loading-lesson-row" key={index}>
        <Lines widths={["3.1rem", "2.25rem"]} /><Lines widths={["83%", "58%", "72%"]} /><Block shape="badge" />
      </div>)}
    </div>
    <Table widths={widths} part="schedule-table" />
    <Rows count={2} grouped />
  </>;
}

function GradeSummary({ ring = true }: { ring?: boolean }) {
  return <div className="surface loading-grade-summary">
    <div className="loading-lines"><Block shape="small" width="6.5rem" /><Block shape="title" width={ring ? "4rem" : "7.5rem"} /><Block shape="small" width="7.5rem" /></div>
    <Block shape={ring ? "ring" : "avatar"} />
  </div>;
}

function Grades() {
  return <>
    <Tabs />
    <div className="loading-columns">
      <div className="loading-stack"><GradeSummary /><CopyCard widths={["61%", "49%"]} /></div>
      <div data-part="grades-list"><Rows grouped badges /></div>
    </div>
  </>;
}

function Subject() {
  return <div className="loading-columns">
    <div className="loading-stack"><GradeSummary ring={false} /><Rows grouped count={1} /><CopyCard widths={["62%"]} /></div>
    <div className="surface loading-card" data-part="scores">
      <Block width="min(11rem, 82%)" />
      {[0, 1, 2].map(index => <div key={index} className="loading-lines"><Block shape="small" width="7rem" /><Block shape="meter" /></div>)}
    </div>
  </div>;
}

function Requests() {
  return <><Block shape="button" /><Block shape="hint" /><Rows badges grouped /></>;
}

function RequestForm() {
  return <div className="loading-form loading-request-form" data-part="request-fields">
    <Fields shapes={["field", "field", "counter", "delivery", "textarea"]} columns />
    <Block shape="hint" />
    <Block shape="button" />
  </div>;
}

function RequestDetail({ staff = false }: { staff?: boolean }) {
  return <div className="loading-columns">
    <div className="loading-stack">
      <div className="surface loading-card"><Block shape="badge" /><Lines widths={["76%", "59%", "43%"]} /></div>
      <div data-part="status-timeline"><Rows badges grouped /></div>
    </div>
    <div className="loading-stack">
      {staff && <div className="surface loading-card"><Block width="68%" /><Fields shapes={["textarea"]} /></div>}
      <Block shape="button" />
    </div>
  </div>;
}

function MessageForm() {
  return <div className="loading-form" data-part="message-fields">
    <div className="surface loading-card"><Fields shapes={["field", "textarea"]} /><Block shape="button" /></div>
    <Block shape="button" />
  </div>;
}

function Profile() {
  return <>
    <div className="surface loading-profile" data-part="identity"><Block shape="avatar" /><Lines widths={["76%", "49%"]} /></div>
    <div className="loading-columns">
      <div className="surface loading-card"><Block width="8rem" /><Lines widths={["43%", "62%"]} /><Lines widths={["41%", "73%"]} /><Lines widths={["51%", "44%"]} /></div>
      <div className="surface loading-card"><Block width="10rem" /><Lines widths={["26%", "34%"]} /></div>
    </div>
    <Block shape="button" width="6rem" />
  </>;
}

function Preferences({ radio = false }: { radio?: boolean }) {
  return <div className="surface loading-card" data-part="settings">
    <Block width="8rem" />
    {Array.from({ length: radio ? 3 : 4 }, (_, index) => <div key={index} className="loading-choice">
      <Block width={index % 2 ? "56%" : "41%"} /><Block shape="badge" width={radio ? "20px" : "48px"} />
    </div>)}
    {!radio && <Block shape="button" />}
  </div>;
}

function StaffOverview() {
  return <>
    <div className="loading-counts" data-part="counts">{[0, 1, 2].map(index => <CopyCard key={index} widths={["48%", "82%"]} />)}</div>
    <div className="loading-columns"><Rows badges grouped /><Rows count={2} grouped /></div>
  </>;
}

function StaffRequests() {
  return <>
    <div className="loading-filters" data-part="filters"><Block shape="field" /><Fields shapes={["field", "field", "field", "field"]} columns /><Block shape="button" /></div>
    <div className="loading-mobile-only"><Rows badges grouped /></div>
    <Table widths={["81%", "58%", "86%", "67%", "60%"]} part="request-table" />
  </>;
}

function StaffEditor({ fields, tabs = false, nameFields = false }: { fields: FieldShape[]; tabs?: boolean; nameFields?: boolean }) {
  return <>
    {tabs && <Tabs />}
    <div className="loading-columns">
      <div className="surface loading-card" data-part="staff-fields">
        <Block width="min(10rem, 80%)" />
        {nameFields && <div className="loading-name-fields"><Fields shapes={["field", "field", "field"]} columns /></div>}
        <Fields shapes={fields} columns />
        <Block shape="button" />
      </div>
      <CopyCard />
    </div>
  </>;
}

const cabinetContent = {
  home: Home, schedule: Schedule, grades: Grades, subject: Subject, requests: Requests,
  "request-form": RequestForm, "request-detail": RequestDetail,
  news: () => <Rows badges />,
  notifications: () => <><Block width="6rem" /><Rows badges /></>,
  "notification-detail": () => <div className="loading-stack"><CopyCard /><Block shape="button" /></div>,
  messages: () => <><Block shape="button" /><Rows badges /></>,
  "message-form": MessageForm,
  thread: () => <div className="loading-stack"><div className="loading-inline"><Block width="8rem" /><Block shape="badge" /></div><CopyCard /><CopyCard widths={["58%", "71%"]} /><Fields shapes={["textarea"]} /><Block shape="button" /></div>,
  profile: Profile,
  preferences: Preferences,
  theme: () => <Preferences radio />,
  more: () => <div className="loading-stack"><Rows count={1} /><Rows count={5} grouped /></div>,
  contacts: () => <div className="loading-stack"><CopyCard /><Rows grouped /></div>,
  about: () => <div className="loading-stack"><CopyCard /><CopyCard /><Block shape="button" /></div>,
  "staff-home": StaffOverview,
  "staff-requests": StaffRequests,
  "staff-request-detail": () => <RequestDetail staff />,
  "staff-announcements": () => <StaffEditor fields={["field", "textarea", "field", "field"]} />,
  "staff-schedule": () => <StaffEditor fields={["field", "field", "field", "field", "textarea"]} tabs />,
  "staff-students": () => <StaffEditor fields={["field", "field", "field", "field", "field"]} tabs nameFields />,
};

type Layout = keyof typeof cabinetContent;

const routes: Record<string, Layout | undefined> = {
  "/cabinet": "home", "/schedule": "schedule", "/grades": "grades",
  "/requests": "requests", "/requests/new": "request-form", "/notifications": "notifications", "/news": "news",
  "/messages": "messages", "/messages/new": "message-form", "/profile": "profile",
  "/settings/notifications": "preferences", "/more/theme": "theme", "/more": "more", "/help": "contacts", "/about": "about",
  "/staff": "staff-home", "/staff/requests": "staff-requests", "/staff/announcements": "staff-announcements",
  "/staff/schedule": "staff-schedule", "/staff/students": "staff-students",
};

const detailRoutes: Record<string, Layout | undefined> = {
  "/grades": "subject", "/requests": "request-detail", "/notifications": "notification-detail",
  "/messages": "thread", "/staff/requests": "staff-request-detail",
};

export function SectionLoading({ href }: { href: string }) {
  const pathname = href.split(/[?#]/, 1)[0];
  const parent = pathname.slice(0, pathname.lastIndexOf("/"));
  const layout = routes[pathname] ?? detailRoutes[parent];
  if (!layout) return null;

  const Content = cabinetContent[layout];
  return <div className="section-loading" data-layout={layout} role="status" aria-label="Загружаем страницу">
    <div className="request-page loading-page" aria-hidden="true">
      <div className="request-header loading-page-header"><Block shape="icon" /><Lines widths={["min(13rem, 82%)", "min(9rem, 70%)"]} /></div>
      <Content />
    </div>
  </div>;
}
