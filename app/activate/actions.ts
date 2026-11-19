"use server";

import { hashPassword, verifyPassword } from "better-auth/crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../../lib/db";
import { readViewer, sessionMarker } from "../../lib/viewer";

const passwordFields = z.object({
  temporary: z.string().min(1).max(128),
  password: z.string().min(12).max(128),
  confirmation: z.string().max(128),
});

export async function activateStudent(_previous: { error: string }, form: FormData) {
  const viewer = await readViewer();
  if (!viewer) redirect("/");
  if (!viewer.mustChangePassword || viewer.role !== "student") redirect("/cabinet");

  const parsed = passwordFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Укажите временный пароль и новый пароль длиной от 12 символов." };
  const { temporary, password, confirmation } = parsed.data;
  if (password !== confirmation) return { error: "Новые пароли не совпадают." };
  if (temporary === password) return { error: "Выберите пароль, отличный от временного." };

  const account = await db.account.findFirst({
    where: { userId: viewer.id, providerId: "credential" },
    select: { id: true, password: true },
  });
  if (!account?.password || !await verifyPassword({ hash: account.password, password: temporary })) {
    return { error: "Неверный временный пароль." };
  }

  const hash = await hashPassword(password);
  const changed = await db.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: {
        id: viewer.id, mustChangePassword: true, role: "student",
        temporaryPasswordExpiresAt: viewer.temporaryPasswordExpiresAt,
        OR: [{ temporaryPasswordExpiresAt: null }, { temporaryPasswordExpiresAt: { gt: new Date() } }],
      },
      data: { mustChangePassword: false, temporaryPasswordExpiresAt: null },
    });
    if (!updated.count) return false;
    await tx.account.update({ where: { id: account.id, password: account.password }, data: { password: hash } });
    await tx.session.deleteMany({ where: { userId: viewer.id } });
    return true;
  });
  if (!changed) return { error: "Временный пароль больше не действует. Обратитесь в деканат." };
  (await cookies()).delete(sessionMarker);
  redirect("/?activated=1");
}
