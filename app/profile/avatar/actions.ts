"use server";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { avatarMaxBytes, avatarUploadLimit, stockAvatars, stockAvatarSource } from "../../../lib/stock-avatars";
import { avatarUploadOrder, normalizeAvatar } from "../../../lib/user-avatar";
import { getRequestViewer } from "../../../lib/viewer";

export async function changeAvatar(_state: { error: string }, form: FormData) {
  const viewer = await getRequestViewer();
  if (!viewer) return { error: "Войдите в аккаунт ещё раз." };

  const intent = form.get("intent");
  if (intent !== "select" && intent !== "upload" && intent !== "remove") return { error: "Выберите действие." };

  const choice = intent === "select" ? form.get("avatarChoice") : null;
  const preset = stockAvatars.find(avatar => choice === `preset:${avatar.id}`);
  const uploadId = typeof choice === "string" ? /^upload:([0-9a-f-]{36})$/i.exec(choice)?.[1] : undefined;
  if (intent === "select" && !preset && !uploadId) return { error: "Выберите аватарку из списка." };

  try {
    let newContent: Uint8Array<ArrayBuffer> | undefined;
    if (intent === "upload") {
      const file = form.get("avatar");
      if (!(file instanceof File) || !file.size || file.size > avatarMaxBytes) {
        return { error: "Выберите JPG, PNG или WebP до 5 МБ." };
      }
      newContent = await normalizeAvatar(Buffer.from(await file.arrayBuffer()), true);
    } else if (preset) {
      newContent = await normalizeAvatar(await readFile(join(process.cwd(), "public", stockAvatarSource(preset.id))));
    }

    const saved = await db.$transaction(async tx => {
      // Serialize selection and pruning for this account across tabs.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${viewer.id} FOR UPDATE`;
      if (intent === "remove") {
        await tx.userAvatar.deleteMany({ where: { userId: viewer.id } });
        return true;
      }

      let content = newContent;
      let selectedUploadId: string | null = null;
      if (intent === "upload" && content) {
        const previousUploads = await tx.userAvatarUpload.findMany({
          where: { userId: viewer.id },
          orderBy: avatarUploadOrder,
          select: { id: true, createdAt: true },
        });
        const newestTime = previousUploads[0]?.createdAt.getTime() ?? 0;
        const upload = await tx.userAvatarUpload.create({
          data: { userId: viewer.id, content, createdAt: new Date(Math.max(Date.now(), newestTime + 1)) },
          select: { id: true },
        });
        selectedUploadId = upload.id;
        const olderUploads = previousUploads.slice(avatarUploadLimit - 1);
        if (olderUploads.length) {
          await tx.userAvatarUpload.deleteMany({ where: { id: { in: olderUploads.map(item => item.id) } } });
        }
      } else if (uploadId) {
        const upload = await tx.userAvatarUpload.findUnique({
          where: { id: uploadId, userId: viewer.id },
          select: { content: true },
        });
        if (!upload) return false;
        content = upload.content;
        selectedUploadId = uploadId;
      }

      if (!content) return false;
      const data = { content, presetId: preset?.id ?? null, uploadId: selectedUploadId };
      await tx.userAvatar.upsert({ where: { userId: viewer.id }, create: { userId: viewer.id, ...data }, update: data });
      return true;
    });
    if (!saved) return { error: "Аватарка больше недоступна. Обновите список." };
  } catch {
    return { error: intent === "upload"
      ? "Не удалось сохранить аватарку. Выберите квадратное изображение или обрежьте его до 1:1."
      : "Не удалось обновить аватарку. Попробуйте ещё раз." };
  }

  revalidatePath("/", "layout");
  redirect("/profile/avatar?updated=" + (intent === "remove" ? "removed" : "saved"));
}
