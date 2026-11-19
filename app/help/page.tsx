import { getRequestViewer } from "../../lib/viewer";
import { CabinetNotificationsLink, CabinetShell } from "../cabinet-shell";
import { StudentPromos } from "../cabinet/student-promos";
import { Icon, ProjectLabel, RequestHeader } from "../requests/request-ui";
import "../account-information.css";

const contacts = [
  { title: "Телефон", text: "+7 (000) 123-45-67", href: "tel:+70001234567", icon: "contact-phone" },
  { title: "Электронная почта", text: "help@dekanat.example", href: "mailto:help@dekanat.example", icon: "contact-mail" },
];

const faq = [
  ["Как заказать справку?", "Откройте «Заявки», нажмите «Новая заявка» и заполните форму."],
  ["Когда будет готов документ?", "Ожидаемая дата указана в карточке заявки. При смене статуса придёт уведомление."],
  ["Как уточнить расписание?", "Проверьте вкладку «Расписание» и последние уведомления об изменениях."],
  ["Что делать при пересдаче?", "Откройте карточку предмета. Если дата не указана, уточните её в разделе «Обращения»."],
];

export default async function Help() {
  const viewer = await getRequestViewer();
  const staff = viewer?.role === "staff";
  const content = (
    <main className="request-page account-page">
      <RequestHeader title={viewer ? "Помощь" : "Помощь со входом"} subtitle="Цифровой деканат" back={viewer ? undefined : "/"}
        staff={staff} end={viewer && !staff ? <CabinetNotificationsLink /> : undefined} />
      {!viewer && <section id="access" className="surface request-summary">
        <h2>Восстановление доступа</h2>
        <p>Обратитесь в учебный деканат и назовите логин или ФИО и группу. Сотрудник выдаст временный пароль. Он действует 24 часа.</p>
        <p>Войдите с временным паролем и задайте новый. Если пароль истёк, запросите его ещё раз.</p>
      </section>}
      <section className="surface request-summary help-contacts">
        <div><h2>Учебный деканат</h2><p className="muted">Все контакты вымышленные</p></div>
        {!viewer && <p>Проверьте логин и пароль. Для знакомства с сервисом можно выбрать студента в блоке «Демо-доступ».</p>}
        {contacts.map(contact => <a className="help-contact-row" href={contact.href} key={contact.icon}>
          <span className="contact-icon"><Icon name={contact.icon} size={20} monochrome /></span>
          <span className="help-contact-copy"><small className="muted">{contact.title}</small><span>{contact.text}</span></span>
        </a>)}
        <dl className="help-hours-grid">
          <div><dt><Icon name="contact-clock" size={14} monochrome />Часы работы</dt><dd>Пн–Пт · 09:00–18:00</dd></div>
          <div><dt><Icon name="contact-room" size={14} monochrome />Кабинет</dt><dd>А-101</dd></div>
        </dl>
      </section>
      <section id="faq" className="help-faq" aria-labelledby="faq-title">
        <div className="help-faq-heading">
          <span className="contact-icon"><Icon name="menu-help" size={20} monochrome /></span>
          <h2 id="faq-title">Частые вопросы</h2>
        </div>
        <div className="surface">
          {faq.map(([question, answer]) => <details className="faq-item" key={question}>
            <summary className="menu-link">
              <Icon name="menu-help" size={18} monochrome /><span className="menu-label">{question}</span><Icon name="request-chevron" size={14} monochrome />
            </summary>
            <p className="muted">{answer}</p>
          </details>)}
        </div>
      </section>
      {viewer?.role === "student" && <StudentPromos viewer={viewer} placement="help" />}
      <ProjectLabel />
    </main>
  );
  return viewer ? <CabinetShell role={staff ? "staff" : "student"} active="more" viewer={viewer} pageTitle="Помощь">{content}</CabinetShell> : content;
}
