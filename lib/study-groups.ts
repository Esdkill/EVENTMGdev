import { z } from "zod";
import { db } from "./db";

export const groupCode = z.string().trim().toUpperCase().min(1, "Укажите код группы.").max(30, "Код группы должен содержать не больше 30 символов.");

export async function studyGroupCodes() {
  const groups = await db.studyGroup.findMany({ orderBy: { code: "asc" }, select: { code: true } });
  return groups.map(group => group.code);
}
