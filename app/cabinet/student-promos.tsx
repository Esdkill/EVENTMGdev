import { db } from "../../lib/db";
import { visiblePromoBanners, type PromoPlacement } from "../../lib/promo-banners";
import { Icon } from "../requests/request-ui";
import { PromoCarousel } from "./promo-carousel";
import "./promo.css";

export async function StudentPromos({ viewer, placement }: { viewer: { isDemo: boolean }; placement: PromoPlacement }) {
  const banners = await db.promoBanner.findMany({
    where: { ...visiblePromoBanners(viewer), placements: { has: placement } },
    select: { id: true, title: true, href: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (!banners.length) return null;
  if (placement === "home") return <PromoCarousel items={banners} autoPlay />;

  return <section className="student-promos" aria-labelledby="student-promos-title">
    <h2 id="student-promos-title">{placement === "help" ? "Полезные ссылки" : "Баннеры"}</h2>
    {placement === "help" ? <ul className="promo-link-list">
      {banners.map(banner => <li key={banner.id}>
        <a className="surface promo-link" href={banner.href} target="_blank" rel="noopener noreferrer">
          <span>{banner.title}</span>
          <Icon name="home-arrow-up" size={16} monochrome />
        </a>
      </li>)}
    </ul> : <PromoCarousel items={banners} autoPlay={false} />}
  </section>;
}
