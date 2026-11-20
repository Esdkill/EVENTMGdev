import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../../../lib/db";
import { promoImageUrl, promoPlacements } from "../../../lib/promo-banners";
import { getRequestViewer } from "../../../lib/viewer";
import { CabinetShell } from "../../cabinet-shell";
import { ProjectLabel, RequestHeader } from "../../requests/request-ui";
import { hidePromoBanner } from "./actions";
import { BannerForm } from "./banner-form";
import "../../cabinet/promo.css";

export default async function BannersPage({ searchParams }: { searchParams: Promise<{ edit?: string; published?: string; saved?: string }> }) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") redirect("/cabinet");
  const query = await searchParams;
  const edit = z.uuid().safeParse(query.edit);
  const banners = await db.promoBanner.findMany({
    select: { id: true, title: true, href: true, placements: true, published: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const initial = edit.success ? banners.find(banner => banner.id === edit.data) : undefined;
  const id = initial?.id ?? randomUUID();
  return <CabinetShell role="staff" viewer={viewer} active="banners">
    <main className="request-page assistant-settings-page">
      <RequestHeader title="Баннеры" subtitle="Размещение для всех студентов" />
      {query.published && <p className="request-callout" role="status">Баннер опубликован.</p>}
      {query.saved && <p className="request-callout" role="status">Черновик сохранён.</p>}
      <div className="assistant-settings-grid">
        <BannerForm key={id} id={id} initial={initial} />
        <section className="surface request-summary">
          <h2>Слайды</h2>
          {!banners.length && <p className="muted">Пока нет баннеров.</p>}
          <ul className="promo-admin-list">
            {banners.map(banner => <li key={banner.id} className="request-summary">
              <img src={promoImageUrl(banner.id)} alt="" />
              <div className="request-row action-row">
                <strong>{banner.title}</strong>
                <span className="request-badge">{banner.published ? "Опубликован" : "Скрыт"}</span>
              </div>
              <p className="muted">{banner.placements.map(placement => promoPlacements[placement]).join(", ")}{!banner.href && " · Без ссылки"}</p>
              <div className="request-row action-row">
                <Link className="secondary request-button" href={`/staff/banners?edit=${banner.id}`}>Редактировать</Link>
                {banner.published && <form action={hidePromoBanner}><input type="hidden" name="id" value={banner.id} /><button className="secondary">Скрыть</button></form>}
              </div>
            </li>)}
          </ul>
          {initial && <Link className="secondary request-button" href="/staff/banners">Добавить другой баннер</Link>}
        </section>
      </div>
      <ProjectLabel />
    </main>
  </CabinetShell>;
}
