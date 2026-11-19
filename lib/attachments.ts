import { pdfLimit, RequestError } from "./requests";

export const attachmentHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function readAttachment(input: FormDataEntryValue | null) {
  if (!(input instanceof File) || input.size === 0) return undefined;
  if (input.size > pdfLimit) throw new RequestError(422, "Файл должен быть не больше 10 МБ.");
  const content = new Uint8Array(await input.arrayBuffer());
  const starts = (...bytes: number[]) => bytes.every((byte, index) => content[index] === byte);
  const mime = starts(0x25, 0x50, 0x44, 0x46, 0x2d) ? "application/pdf" :
    starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) ? "image/png" :
    starts(0xff, 0xd8, 0xff) ? "image/jpeg" : undefined;
  if (!mime) throw new RequestError(422, "Прикрепите файл PDF, JPG или PNG.");
  const name = Array.from(input.name.replace(/[\u0000-\u001f\u007f/\\]/g, "_")).slice(0, 180).join("") || "Файл";
  return { name, mime, content };
}

export function downloadAttachment(file: { name: string; mime: string; content: Uint8Array<ArrayBuffer> }, disposition: "attachment" | "inline" = "attachment") {
  const filename = encodeURIComponent(file.name).replace(/['()*]/g, char => "%" + char.charCodeAt(0).toString(16));
  return new Response(file.content, { headers: {
    ...attachmentHeaders, "Content-Type": file.mime, "Content-Disposition": `${disposition}; filename*=UTF-8''${filename}`,
  } });
}
