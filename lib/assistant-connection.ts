import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { AssistantApiSettings } from "./assistant-api-settings";
import { db } from "./db";

export const assistantSettingsId = "deanery";

function encryptionKey() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("Assistant encryption unavailable");
  return createHash("sha256").update("deanery-openrouter-key:").update(secret).digest();
}

export function encryptAssistantKey(key: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(key, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(part => part.toString("base64url")).join(".");
}

function decryptAssistantKey(value: string) {
  const [iv, tag, data] = value.split(".").map(part => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export async function getAssistantConnection() {
  const saved = await db.assistantSettings.findUnique({
    where: { id: assistantSettingsId },
    select: { model: true, encryptedKey: true, apiUrl: true, protocol: true, updatedAt: true },
  });
  return { ...resolveAssistantConnection(saved), updatedAt: saved?.updatedAt };
}

export async function removeAssistantConnectionAt(updatedAt: Date) {
  return db.assistantSettings.updateMany({
    where: { id: assistantSettingsId, updatedAt, encryptedKey: { not: null } },
    data: { encryptedKey: null, provider: null, apiUrl: "", model: "", protocol: "compatible" },
  });
}

export function resolveAssistantConnection(saved: (AssistantApiSettings & { model: string; encryptedKey: string | null }) | null) {
  if (!saved?.encryptedKey) {
    return { model: "", apiUrl: "", protocol: "compatible" as const, apiKey: undefined };
  }
  return {
    model: saved.model,
    apiUrl: saved.apiUrl,
    protocol: saved.protocol,
    apiKey: decryptAssistantKey(saved.encryptedKey),
  };
}
