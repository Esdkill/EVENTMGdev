"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { auth } from "../../lib/auth";
import { db } from "../../lib/db";
import { studentCardNumber } from "../../lib/student-documents";
import { demoPasswordRestriction } from "../../lib/demo";
import { getRequestViewer } from "../../lib/viewer";

type State = { error?: string; saved?: boolean };

const passwordFields = z.object({
  method: z.enum(["password", "student-number"]).default("password"),
  current: z.string().max(128).optional(),
  studentNumber: z.string().max(24).optional(),
  password: z.string().min(12).max(128),
  confirmation: z.string().max(128),
});
const recoveryWindowMs = 60 * 60 * 1000;
const maxRecoveryFailures = 5;

async function verifyStudentCard(tx: Prisma.TransactionClient, userId: string, number: string) {
  // Serialize attempts across all sessions of the student.
  const [profile] = await tx.$queryRaw<Array<{
    studentNumber: string | null;
    recoveryFailures: number;
    recoveryWindowStartedAt: Date | null;
  }>>`SELECT "studentNumber", "recoveryFailures", "recoveryWindowStartedAt"
      FROM "StudentProfile" WHERE "userId" = ${userId} FOR UPDATE`;
  if (!profile?.studentNumber) return "Номер студенческого ещё не указан. Обратитесь в учебный деканат.";

  const now = new Date();
  const windowActive = profile.recoveryWindowStartedAt &&
    now.getTime() - profile.recoveryWindowStartedAt.getTime() < recoveryWindowMs;
  const failureCount = windowActive ? profile.recoveryFailures : 0;
  if (failureCount >= maxRecoveryFailures) return "Слишком много попыток. Попробуйте позже или обратитесь в учебный деканат.";

  const expected = createHash("sha256").update(profile.studentNumber).digest();
  const provided = createHash("sha256").update(number).digest();
  if (!timingSafeEqual(expected, provided)) {
    await tx.studentProfile.update({
      where: { userId },
      data: { recoveryFailures: failureCount + 1, recoveryWindowStartedAt: windowActive ? profile.recoveryWindowStartedAt : now },
    });
    return "Номер студенческого не совпадает. Проверьте номер на документе.";
  }

  return undefined;
}

export async function changeStudentPassword(_previous: State, form: FormData): Promise<State> {
  const viewer = await getRequestViewer();
  if (viewer?.role !== "student") return { error: "Войдите в кабинет студента." };
  if (viewer.isDemo) return { error: demoPasswordRestriction };

  const parsed = passwordFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Заполните поля и укажите новый пароль от 12 до 128 символов." };
  const { method, current, password, confirmation } = parsed.data;
  if (password !== confirmation) return { error: "Новые пароли не совпадают." };

  let cardNumber: string | undefined;
  if (method === "student-number") {
    const number = studentCardNumber.safeParse(parsed.data.studentNumber);
    if (!number.success) return { error: "Укажите номер со студенческого билета." };
    cardNumber = number.data;
  } else if (!current) {
    return { error: "Введите текущий пароль." };
  }

  const [session, account] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    db.account.findFirst({ where: { userId: viewer.id, providerId: "credential" }, select: { id: true, password: true } }),
  ]);
  if (session?.user.id !== viewer.id) return { error: "Сессия истекла. Войдите снова." };
  if (!account?.password) return { error: "Не удалось сменить пароль. Обратитесь в учебный деканат." };
  const previousHash = account.password;

  if (method === "password") {
    if (!current || !await verifyPassword({ hash: previousHash, password: current })) {
      return { error: "Текущий пароль указан неверно." };
    }
    if (password === current) return { error: "Выберите пароль, отличный от текущего." };
  }

  const hash = await hashPassword(password);
  return db.$transaction(async tx => {
    const active = await tx.session.findFirst({
      where: { id: session.session.id, userId: viewer.id, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!active) return { error: "Сессия истекла. Войдите снова." };
    if (cardNumber) {
      const error = await verifyStudentCard(tx, viewer.id, cardNumber);
      if (error) return { error };
      if (await verifyPassword({ hash: previousHash, password })) {
        return { error: "Выберите пароль, отличный от текущего." };
      }
    }

    const updated = await tx.account.updateMany({ where: { id: account.id, password: previousHash }, data: { password: hash } });
    if (!updated.count) return { error: "Пароль уже изменился. Обновите страницу и попробуйте снова." };
    if (cardNumber) await tx.studentProfile.update({
      where: { userId: viewer.id }, data: { recoveryFailures: 0, recoveryWindowStartedAt: null },
    });
    await tx.session.deleteMany({ where: { userId: viewer.id, id: { not: active.id } } });
    return { saved: true };
  });
}
