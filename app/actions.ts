"use server";

import { APIError } from "better-auth/api";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { demoPassword } from "../lib/demo";
import { getViewer, sessionMarker } from "../lib/viewer";

const signInFields = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(128),
});

async function authenticate(username: string, password: string) {
  try {
    await auth.api.signInUsername({ headers: await headers(), body: { username, password } });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    return { error: error.statusCode === 429 ? "Слишком много попыток. Попробуйте позже." : "Неверный логин или пароль" };
  }
  (await cookies()).set(sessionMarker, "1", {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60,
    secure: process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false,
  });
  redirect("/cabinet");
}

export async function signIn(_previous: { error: string }, form: FormData) {
  const fields = signInFields.safeParse({ username: form.get("username"), password: form.get("password") });
  if (!fields.success) return { error: "Введите логин и пароль" };
  return authenticate(fields.data.username, fields.data.password);
}

export async function signInDemo(_previous: { error: string }, form: FormData) {
  if (process.env.DEMO_ACCESS !== "true") return { error: "Демо-доступ выключен" };
  const username = form.get("demo");
  if (username !== "anna" && username !== "maxim") return { error: "Выберите демо-аккаунт" };
  if (await getViewer()) redirect("/cabinet");

  const password = demoPassword(username);
  const account = await db.user.findUnique({ where: { username }, select: { isDemo: true, role: true } });
  if (!password || !account?.isDemo || account.role !== "student") return { error: "Демо-аккаунт пока недоступен" };
  return authenticate(username, password);
}

export async function signOut(): Promise<never> {
  await auth.api.signOut({ headers: await headers() });
  (await cookies()).delete(sessionMarker);
  redirect("/");
}
