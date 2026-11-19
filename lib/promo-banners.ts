export const promoPlacements = {
  home: "Главная",
  news: "Новости",
  help: "Помощь",
} as const;

export type PromoPlacement = keyof typeof promoPlacements;

export function visiblePromoBanners(viewer: { isDemo: boolean }) {
  const cohort = viewer.isDemo ? "demo" as const : "live" as const;
  return { cohort, published: true };
}

export function promoImageUrl(id: string) {
  return `/api/v1/banners/${id}`;
}
