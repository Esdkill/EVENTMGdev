import { db } from "../../../../../lib/db";
import { getRequestViewer } from "../../../../../lib/viewer";
import { requestNumber } from "../../../../../lib/request-fields";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getRequestViewer();
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!viewer) return new Response(null, { status: 401, headers });
  if (viewer.role !== "student" && viewer.role !== "staff") return new Response(null, { status: 403, headers });

  const { id } = await params;
  const document = await db.requestDocument.findFirst({
    where: {
      id,
      request: {
        status: { in: ["READY", "ISSUED"] },
        ...(viewer.role === "student" ? { ownerId: viewer.id } : {}),
      },
    },
    select: { content: true, size: true, request: { select: { number: true } } },
  });
  if (!document) return new Response(null, { status: 404, headers });
  return new Response(document.content, {
    headers: {
      ...headers,
      "Content-Type": "application/pdf",
      "Content-Length": String(document.size),
      "Content-Disposition": `attachment; filename="document-${requestNumber(document.request.number)}.pdf"`,
    },
  });
}
