export const demoPasswordRestriction = "В демо-режиме нельзя сменить пароль.";

export const demoStudents = [
  {
    username: "anna",
    firstName: "Анна",
    lastName: "Волкова",
    patronymic: "Сергеевна",
    initials: "АВ",
    group: "БИ-2-1",
    year: 2,
  },
  {
    username: "maxim",
    firstName: "Максим",
    lastName: "Орлов",
    patronymic: "Андреевич",
    initials: "МО",
    group: "БИ-3-2",
    year: 3,
  },
] as const;

export function demoPassword(username: string) {
  if (username === "anna") return process.env.DEMO_ANNA_PASSWORD;
  if (username === "maxim") return process.env.DEMO_MAXIM_PASSWORD;
}
