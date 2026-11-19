import { reply, requestFailure, requireRole, verifyRequestOrigin } from "../../../../../../../lib/request-api";
import { changeStatus, pdfLimit, RequestError, staffAction } from "../../../../../../../lib/requests";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireRole("staff");
    verifyRequestOrigin(request);
    const { id } = await params;
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > pdfLimit + 1024 * 1024) throw new RequestError(422, "PDF должен быть размером до 10 МБ.");
    let data: Record<string, unknown>;
    try {
      data = request.headers.get("content-type")?.startsWith("multipart/form-data")
        ? Object.fromEntries(await request.formData())
        : await request.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    } catch {
      throw new RequestError(400, "Некорректный запрос");
    }
    return reply(await changeStatus(viewer, id, staffAction.parse(data.action), data.version, data.reason, data.document instanceof File ? data.document : undefined));
  } catch (error) { return requestFailure(error); }
}
