import Link from "next/link";
import { getRequestViewer } from "../../lib/viewer";
import { CabinetNotificationsLink, CabinetShell } from "../cabinet-shell";
import { Icon, ProjectLabel, RequestHeader } from "../requests/request-ui";
import "../account-information.css";

export default async function AboutPage() {
  const viewer = await getRequestViewer();
  const staff = viewer?.role === "staff";
  const content = (
    <main className="request-page account-page">
      <RequestHeader title="О проекте" subtitle="Цифровой деканат" back={viewer ? undefined : "/"}
        staff={staff} end={viewer && !staff ? <CabinetNotificationsLink /> : undefined} />
      <section className="surface request-summary about-project">
        <div className="about-header-row">
          <span className="contact-icon"><Icon name="about-cap" size={26} monochrome /></span>
          <div><strong>MGIMO AI Challenge</strong><p className="muted">Конкурсный проект</p></div>
        </div>
        <h2>Цифровой деканат</h2>
        <p className="muted">Учёба, расписание и документы<br />в одном месте.</p>
        <div className="about-info-box">
          <Icon name="about-info" size={17} monochrome />
          <p className="muted">Не является официальным сервисом вуза. Все данные вымышленные.</p>
        </div>
      </section>
      <section className="surface request-summary about-resources">
        <h2>Открытые ресурсы</h2>
        <div className="about-resource">
          <span className="contact-icon" aria-hidden="true">Aa</span>
          <div><strong>Inter</strong><p className="muted">Шрифт · SIL Open Font License 1.1</p></div>
        </div>
        <div className="about-resource">
          <span className="contact-icon" aria-hidden="true">◇</span>
          <div><strong>Lucide</strong><p className="muted">Иконки · ISC License</p></div>
        </div>
        <p className="muted">Иллюстрации — из набора проекта.</p>
      </section>
      <Link className="secondary request-button" href={staff ? "/staff" : viewer ? "/cabinet" : "/"}>На главную</Link>
      <ProjectLabel />
    </main>
  );
  return viewer ? <CabinetShell role={staff ? "staff" : "student"} active="more" viewer={viewer} pageTitle="О проекте">{content}</CabinetShell> : content;
}
