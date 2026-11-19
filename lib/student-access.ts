import { randomBytes } from "node:crypto";

export function createTemporaryPassword() {
  return {
    password: randomBytes(12).toString("base64url"),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}
