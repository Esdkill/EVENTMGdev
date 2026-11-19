export function avatarSource(avatar: { updatedAt: Date } | null | undefined, demoUsername?: string) {
  if (!avatar) return undefined;
  const query = new URLSearchParams({ v: String(avatar.updatedAt.getTime()) });
  if (demoUsername) query.set("demo", demoUsername);
  return `/api/v1/avatar?${query}`;
}

export async function normalizeAvatar(bytes: Buffer, requireSquare = false) {
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!png && !jpeg && !webp) throw new Error("Unsupported avatar image");
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const image = await loadImage(bytes);
  if (requireSquare && image.width !== image.height) throw new Error("Avatar must be square");
  const side = Math.min(image.width, image.height);
  if (side < 1) throw new Error("Empty avatar image");
  const canvas = createCanvas(512, 512);
  canvas.getContext("2d").drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 512, 512);
  return new Uint8Array(await canvas.encode("png"));
}
export const avatarUploadOrder = [{ createdAt: "desc" as const }, { id: "desc" as const }];

