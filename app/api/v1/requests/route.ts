import { z } from "zod";
import { db } from "../../../../lib/db";
import { reply, requestBody, requestFailure, requireRole } from "../../../../lib/request-api";
import { requestStatus } from "../../../../lib/request-fields";
import { submitRequest } from "../../../../lib/requests";

export async function GET(request: Request) {
  try {
    const viewer = await requireRole("student");
    const query = new URL(request.url).searchParams;
    const status = requestStatus.safeParse(query.get("status")).data;
    const limit = z.coerce.number().int().min(1).max(100).catch(20).parse(query.get("limit") ?? 20);
    const cursor = query.get("cursor");
    const where = { ownerId: viewer.id, status };
    const after = cursor ? await db.documentRequest.findFirst({ where: { ...where, id: cursor }, select: { id: true } }) : null;
    if (cursor && !after) return Response.json({ data: [], nextCursor: null }, { headers: { "Cache-Control": "private, no-store" } });
    const records = await db.documentRequest.findMany({
      where, take: limit + 1, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(after ? { cursor: { id: after.id }, skip: 1 } : {}),
      select: { id: true, number: true, type: true, status: true, delivery: true, createdAt: true, dueOn: true },
    });
    const data = records.slice(0, limit);
    return Response.json({ data, nextCursor: records.length > limit ? data.at(-1)?.id : null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return requestFailure(error); }
}

export async function POST(request: Request) {
  try {
    const viewer = await requireRole("student");
    return reply(await submitRequest(viewer.id, request.headers.get("idempotency-key"), await requestBody(request)), 201);
  } catch (error) { return requestFailure(error); }
}
