import { getViewer } from "../../../../lib/viewer";

export async function GET() {
  const viewer = await getViewer();
  const headers = { "Cache-Control": "private, no-store" };
  if (!viewer) {
    return Response.json({ error: { code: "UNAUTHENTICATED", message: "Войдите снова" } }, { status: 401, headers });
  }
  return Response.json({ data: viewer }, { headers });
}
