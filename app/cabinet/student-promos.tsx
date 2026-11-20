import { db } from "../../lib/db";
import { promoImageUrl, type PromoPlacement } from "../../lib/promo-banners";
import { Icon } from "../requests/request-ui";
import { PromoCarousel } from "./promo-carousel";
import "./promo.css";

export async function StudentPromos({ placement }: { placement: PromoPlacement }) {
  const banners = await db.promoBanner.findMany({
    where: { published: true, placements: { has: placement } },
    select: { id: true, title: true, href: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (!banners.length) return null;
  if (placement === "home") return <PromoCarousel items={banners} autoPlay />;

  const title = placement === "help"
    ? banners.every(banner => banner.href) ? "Полезные ссылки" : "Полезные материалы"
    : "Баннеры";
  return <section className="student-promos" aria-labelledby="student-promos-title">
    <h2 id="student-promos-title">{title}</h2>
    {placement === "help" ? <ul className="promo-link-list">
      {banners.map(banner => <li key={banner.id}>
        {banner.href ? <a className="surface promo-link" href={banner.href} target="_blank" rel="noopener noreferrer">
          <span>{banner.title}</span>
          <Icon name="home-arrow-up" size={16} monochrome />
        </a> : <figure className="promo-help-banner">
          <img src={promoImageUrl(banner.id)} alt={banner.title} loading="lazy" decoding="async" />
        </figure>}
      </li>)}
    </ul> : <PromoCarousel items={banners} autoPlay={false} />}
  </section>;
}
