import { z } from "zod";
import { attachmentHeaders } from "../../../../../lib/attachments";
import { db } from "../../../../../lib/db";
import { visiblePromoBanners } from "../../../../../lib/promo-banners";
import { getRequestViewer } from "../../../../../lib/viewer";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getRequestViewer();
  const id = z.uuid().safeParse((await params).id);
  if (!viewer || !id.success) return new Response(null, { status: 404 });
  const banner = await db.promoBanner.findFirst({
    where: { id: id.data, ...(viewer.role === "student" ? visiblePromoBanners(viewer) : {}) },
    select: { image: true, mime: true },
  });
  if (!banner) return new Response(null, { status: 404 });
  return new Response(banner.image, { headers: { ...attachmentHeaders, "Content-Type": banner.mime } });
}
