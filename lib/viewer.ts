import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "./db";

export const sessionMarker = "deanery-session";

export async function readViewer() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const viewer = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: { select: { updatedAt: true, presetId: true, uploadId: true } },
      role: true,
      isDemo: true,
      mustChangePassword: true,
      temporaryPasswordExpiresAt: true,
      studentProfile: {
        select: { faculty: true, program: true, group: true, year: true, firstName: true, lastName: true, patronymic: true },
      },
    },
  });
  if (viewer?.mustChangePassword && viewer.temporaryPasswordExpiresAt && viewer.temporaryPasswordExpiresAt.getTime() <= Date.now()) return null;
  return viewer;
}

export async function getRequestViewer() {
  const viewer = await readViewer();
  return viewer?.mustChangePassword ? null : viewer;
}

export async function getViewer() {
  const viewer = await getRequestViewer();
  if (!viewer) return null;
  return { id: viewer.id, name: viewer.name, role: viewer.role, isDemo: viewer.isDemo, avatar: viewer.avatar, studentProfile: viewer.studentProfile };
}
