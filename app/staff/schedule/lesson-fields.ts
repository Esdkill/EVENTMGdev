export const lessonKinds = ["Лекция", "Семинар", "Лабораторная", "Практика", "Консультация", "Экзамен", "Зачёт"] as const;

const localDate = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });

export function formatLessonDay(day: string) {
  const date = new Date(day + "T12:00:00Z");
  return Number.isFinite(date.valueOf()) ? localDate.format(date) : "";
}

export function formatLessonStart(iso: string) {
  const [day, time] = iso.split("T");
  return iso ? `${formatLessonDay(day)} · ${time}` : "";
}
