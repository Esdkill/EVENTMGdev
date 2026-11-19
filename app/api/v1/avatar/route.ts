import { db } from "../../../../lib/db";
import { demoStudents } from "../../../../lib/demo";
import { getRequestViewer } from "../../../../lib/viewer";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "Content-Type": "image/png", "X-Content-Type-Options": "nosniff" };
  const params = new URL(request.url).searchParams;
  const demo = params.get("demo");
  const upload = params.get("upload");
  if (demo !== null && upload === null) {
    if (process.env.DEMO_ACCESS !== "true" || !demoStudents.some(student => student.username === demo)) {
      return new Response(null, { status: 404, headers });
    }
    const user = await db.user.findUnique({
      where: { username: demo, role: "student", isDemo: true },
      select: { avatar: { select: { content: true } } },
    });
    return user?.avatar ? new Response(user.avatar.content, { headers }) : new Response(null, { status: 404, headers });
  }
  const viewer = await getRequestViewer();
  if (!viewer) return new Response(null, { status: 401, headers });
  const avatar = upload === null
    ? await db.userAvatar.findUnique({ where: { userId: viewer.id }, select: { content: true } })
    : await db.userAvatarUpload.findUnique({ where: { id: upload, userId: viewer.id }, select: { content: true } });
  return avatar ? new Response(avatar.content, { headers }) : new Response(null, { status: 404, headers });
}
