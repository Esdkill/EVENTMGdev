import { attachmentHeaders, downloadAttachment } from "../../../../../../lib/attachments";
import { db } from "../../../../../../lib/db";
import { visibleBulletins } from "../../../../../../lib/notifications";
import { getRequestViewer } from "../../../../../../lib/viewer";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getRequestViewer();
  const headers = attachmentHeaders;
  if (!viewer) return new Response(null, { status: 401, headers });

  const { id } = await params;
  const file = await db.bulletinAttachment.findFirst({
    where: { bulletinId: id, bulletin: visibleBulletins(viewer) },
  });
  return file ? downloadAttachment(file) : new Response(null, { status: 404, headers });
}
