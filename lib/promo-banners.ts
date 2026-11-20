export const promoPlacements = {
  home: "Главная",
  news: "Новости",
  help: "Помощь",
} as const;

export type PromoPlacement = keyof typeof promoPlacements;

export function promoImageUrl(id: string) {
  return `/api/v1/banners/${id}`;
}
