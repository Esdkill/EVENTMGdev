"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readAttachment } from "../../../lib/attachments";
import { db } from "../../../lib/db";
import { externalHttpsUrl } from "../../../lib/external-url";
import { promoPlacements } from "../../../lib/promo-banners";
import { getRequestViewer } from "../../../lib/viewer";

const inputs = z.object({
  id: z.uuid(),
  edit: z.literal("yes").optional(),
  title: z.string().trim().min(1).max(160),
  href: externalHttpsUrl,
  cohort: z.enum(["demo", "live"]),
  placements: z.array(z.enum(Object.keys(promoPlacements) as (keyof typeof promoPlacements)[])).min(1).max(3).transform(items => [...new Set(items)]),
});

export async function savePromoBanner(_state: { error: string }, form: FormData) {
  if ((await getRequestViewer())?.role !== "staff") return { error: "Публикация доступна сотруднику деканата." };
  const result = inputs.safeParse({ ...Object.fromEntries(form), placements: form.getAll("placements") });
  if (!result.success) return { error: "Проверьте название, HTTPS-ссылку и аудиторию. Выберите хотя бы одну страницу показа." };
  const { id, edit, ...values } = result.data;
  let attachment: Awaited<ReturnType<typeof readAttachment>>;
  try {
    const uploaded = form.get("image");
    if (uploaded instanceof File && uploaded.size > 5 * 1024 * 1024) return { error: "Картинка должна быть не больше 5 МБ." };
    attachment = await readAttachment(uploaded);
  } catch {
    return { error: "Загрузите картинку в формате PNG или JPG." };
  }
  if (attachment?.mime === "application/pdf") return { error: "Загрузите картинку в формате PNG или JPG." };
  if (!attachment && !edit) return { error: "Загрузите картинку для баннера." };
  const published = form.get("intent") === "publish";
  try {
    if (edit) {
      const change = await db.promoBanner.updateMany({
        where: { id },
        data: { ...values, published, ...(attachment ? { image: attachment.content, mime: attachment.mime } : {}) },
      });
      if (!change.count) return { error: "Баннер уже удалён." };
    } else if (attachment) {
      await db.promoBanner.upsert({
        where: { id }, create: { id, ...values, published, image: attachment.content, mime: attachment.mime }, update: {},
      });
    }
  } catch {
    return { error: "Баннер не сохранился. Попробуйте ещё раз." };
  }
  revalidatePath("/cabinet");
  revalidatePath("/news");
  revalidatePath("/help");
  revalidatePath("/staff/banners");
  redirect(published ? "/staff/banners?published=1" : "/staff/banners?saved=1");
}

export async function hidePromoBanner(form: FormData) {
  if ((await getRequestViewer())?.role !== "staff") return;
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  await db.promoBanner.updateMany({ where: { id: id.data }, data: { published: false } });
  revalidatePath("/cabinet");
  revalidatePath("/news");
  revalidatePath("/help");
  revalidatePath("/staff/banners");
}
