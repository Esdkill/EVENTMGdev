import { z } from "zod";
import { RequestError } from "./requests";
import { getRequestViewer } from "./viewer";

const headers = { "Cache-Control": "private, no-store" };
export const reply = (data: unknown, status = 200) => Response.json({ data }, { status, headers });

export function requestFailure(error: unknown) {
  if (error instanceof RequestError) {
    const code = ({ 401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 422: "INVALID_FIELDS" } as Record<number, string>)[error.status] ?? "BAD_REQUEST";
    return Response.json({ error: { code, message: error.message } }, { status: error.status, headers });
  }
  if (error instanceof z.ZodError) {
    return Response.json({ error: { code: "INVALID_FIELDS", message: "Проверьте поля формы", fields: z.flattenError(error).fieldErrors } }, { status: 422, headers });
  }
  throw error;
}

export async function requireRole(role: string) {
  const viewer = await getRequestViewer();
  if (!viewer) throw new RequestError(401, "Войдите снова");
  if (viewer.role !== role) throw new RequestError(403, "Действие недоступно");
  return viewer;
}

export function verifyRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.BETTER_AUTH_URL ?? request.url).origin;
  if (origin !== expected) throw new RequestError(403, "Действие недоступно");
}

export async function requestBody(request: Request) {
  verifyRequestOrigin(request);
  try {
    return await request.json();
  } catch {
    throw new RequestError(400, "Некорректный запрос");
  }
}
