import { attachmentHeaders, downloadAttachment } from "../../../../../../lib/attachments";
import { db } from "../../../../../../lib/db";
import { getRequestViewer } from "../../../../../../lib/viewer";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getRequestViewer();
  const headers = attachmentHeaders;
  if (!viewer) return new Response(null, { status: 401, headers });
  if (viewer.role !== "student" && viewer.role !== "staff") return new Response(null, { status: 403, headers });
  const { id } = await params;
  const file = await db.deanAttachment.findFirst({
    where: { messageId: id, ...(viewer.role === "student" ? { message: { thread: { ownerId: viewer.id } } } : {}) },
  });
  if (!file) return new Response(null, { status: 404, headers });
  return downloadAttachment(file);
}
