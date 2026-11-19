import { db } from "../../../../../lib/db";
import { reply, requestFailure, requireRole } from "../../../../../lib/request-api";
import { RequestError, requestMessages } from "../../../../../lib/requests";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireRole("student");
    const { id } = await params;
    const data = await db.documentRequest.findFirst({
      where: { id, ownerId: viewer.id },
      select: {
        id: true, number: true, status: true, type: true, purpose: true, copies: true,
        delivery: true, comment: true, dueOn: true, createdAt: true, version: true,
        events: { orderBy: { createdAt: "asc" }, select: { toStatus: true, createdAt: true, reason: true } },
        messages: requestMessages,
        document: { select: { id: true, size: true, createdAt: true } },
      },
    });
    if (!data) throw new RequestError(404, "Эта заявка вам недоступна");
    return reply(data);
  } catch (error) { return requestFailure(error); }
}
