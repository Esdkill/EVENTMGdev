import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { db } from "./db";

export const auth = betterAuth({
  disabledPaths: ["/change-password"],
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "student", input: false },
    },
  },
  databaseHooks: {
    session: { create: { async before(session) {
      const user = await db.user.findUnique({ where: { id: session.userId }, select: {
        mustChangePassword: true, temporaryPasswordExpiresAt: true,
      } });
      if (user?.mustChangePassword && user.temporaryPasswordExpiresAt && user.temporaryPasswordExpiresAt.getTime() <= Date.now()) {
        throw new APIError("UNAUTHORIZED", { message: "Неверный логин или пароль" });
      }
    } } },
  },
  plugins: [username(), nextCookies()],
});
