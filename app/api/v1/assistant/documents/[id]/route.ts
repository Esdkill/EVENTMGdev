import { z } from "zod";
import { attachmentHeaders, downloadAttachment } from "../../../../../../lib/attachments";
import { db } from "../../../../../../lib/db";
import { getRequestViewer } from "../../../../../../lib/viewer";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getRequestViewer()) return new Response(null, { status: 401, headers: attachmentHeaders });
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return new Response(null, { status: 404, headers: attachmentHeaders });
  const file = await db.assistantDocument.findUnique({
    where: { id: id.data },
    select: { name: true, mime: true, content: true },
  });
  return file ? downloadAttachment(file, file.mime === "application/pdf" ? "inline" : "attachment")
    : new Response(null, { status: 404, headers: attachmentHeaders });
}
