import { z } from "zod";
import { reply, requestBody, requestFailure, requireRole } from "../../../../../../lib/request-api";
import { versionField } from "../../../../../../lib/request-fields";
import { changeStatus } from "../../../../../../lib/requests";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireRole("student");
    const { id } = await params;
    const { version } = z.object({ version: versionField }).parse(await requestBody(request));
    return reply(await changeStatus(viewer, id, "cancel", version));
  } catch (error) { return requestFailure(error); }
}
