import { db } from "./db";
import { knowledgeFileLimit, knowledgeFileLimitMb } from "./assistant-knowledge-limits";
import { createKnowledgeOcr } from "./assistant-ocr";

const maxLength = 600_000;
const fragmentLength = 1_400;
const fragmentOverlap = 160;
const maxPages = 200;
const documentMime = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export class KnowledgeDocumentError extends Error {}

export async function readKnowledgeDocument(file: File, href: string) {
  const name = file.name.replace(/[\u0000-\u001f\u007f/\\]/g, "_");
  if (file.size > knowledgeFileLimit || !file.size) throw new KnowledgeDocumentError(`Выберите непустой файл размером до ${knowledgeFileLimitMb} МБ.`);
  if (name.length > 180) throw new KnowledgeDocumentError("Сократите имя файла до 180 символов.");
  const extension = name.split(".").at(-1)?.toLowerCase();
  if (!extension || !Object.hasOwn(documentMime, extension)) {
    throw new KnowledgeDocumentError("Поддерживаются файлы PDF, DOCX, TXT, JPG и PNG.");
  }

  const content = new Uint8Array(await file.arrayBuffer());
  const title = name.slice(0, -(extension.length + 1)).trim() || name;
  let pages: string[];
  try {
    if (extension === "pdf") {
      if (new TextDecoder().decode(content.subarray(0, 5)) !== "%PDF-") throw new Error("Invalid PDF header");
      const { extractText, getResolvedPDFJS, renderPageAsImage } = await import("unpdf");
      const { getDocument } = await getResolvedPDFJS();
      const task = getDocument({ data: content.slice(), stopAtErrors: true, maxImageSize: 40_000_000 });
      try {
        const pdf = await task.promise;
        if (pdf.numPages > maxPages) throw new KnowledgeDocumentError("Разделите PDF на файлы до 200 страниц.");
        pages = (await extractText(pdf, { mergePages: false })).text;
        const scannedPages = pages.flatMap((text, index) => /[\p{L}\p{N}]/u.test(text) ? [] : [index]);
        if (scannedPages.length) {
          const worker = await createKnowledgeOcr();
          try {
            for (const index of scannedPages) {
              const page = await pdf.getPage(index + 1);
              const { width, height } = page.getViewport({ scale: 1 });
              const scale = 2800 / Math.max(width, height);
              const image = await renderPageAsImage(pdf, index + 1, { scale, canvasImport: () => import("@napi-rs/canvas") });
              pages[index] = (await worker.recognize(Buffer.from(image))).data.text;
              page.cleanup();
            }
          } finally {
            await worker.terminate();
          }
        }
      } finally {
        await task.destroy();
      }
    } else if (extension === "docx") {
      if (content[0] !== 0x50 || content[1] !== 0x4b) throw new Error("Invalid DOCX header");
      const { extractRawText } = await import("mammoth");
      pages = [(await extractRawText({ buffer: Buffer.from(content) })).value];
    } else if (extension === "txt") {
      pages = [new TextDecoder("utf-8", { fatal: true }).decode(content)];
    } else {
      const startsWith = (header: number[]) => header.every((byte, index) => content[index] === byte);
      const isImage = extension === "png" ? startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) : startsWith([0xff, 0xd8, 0xff]);
      if (!isImage) throw new Error("Invalid image header");
      const worker = await createKnowledgeOcr();
      try {
        pages = [(await worker.recognize(Buffer.from(content))).data.text];
      } finally {
        await worker.terminate();
      }
    }
  } catch (error) {
    if (error instanceof KnowledgeDocumentError) throw error;
    throw new KnowledgeDocumentError("Не удалось прочитать файл. Проверьте формат и убедитесь, что документ открывается.");
  }
  if (pages.reduce((total, page) => total + page.length, 0) > maxLength) {
    throw new KnowledgeDocumentError("В документе слишком много текста. Разделите его на несколько файлов.");
  }

  const sources = pages.flatMap((page, index) => {
    const pageNumber = index + 1;
    return splitText(page).map((excerpt, fragmentIndex) => ({
      title,
      section: extension === "pdf" ? `стр. ${pageNumber}` : `фрагмент ${fragmentIndex + 1}`,
      url: extension === "pdf" ? `${href}#page=${pageNumber}` : href,
      excerpt,
    }));
  });
  if (!sources.length) {
    throw new KnowledgeDocumentError("Не удалось распознать текст. Проверьте резкость и освещение скана или фотографии.");
  }
  return { name, mime: documentMime[extension as keyof typeof documentMime], content, sources };
}

function splitText(page: string) {
  const text = page.replace(/[\u0000-\u001f\u007f\s]+/g, " ").trim();
  const fragments: string[] = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + fragmentLength, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf(" ", end);
      if (boundary > start + fragmentLength / 2) end = boundary;
    }
    const fragment = text.slice(start, end).trim();
    if (/[\p{L}\p{N}]/u.test(fragment)) fragments.push(fragment);
    if (end === text.length) break;
    const nextWord = text.indexOf(" ", end - fragmentOverlap);
    start = nextWord >= start && nextWord < end ? nextWord + 1 : end;
  }
  return fragments;
}

export async function findKnowledgeSources(question: string) {
  const words = [...new Set(question.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])].slice(0, 40);
  if (!words.length) return [];
  const terms = words.join(" | ");
  return db.$queryRaw<{ id: string; title: string; section: string; url: string; excerpt: string }[]>`
    SELECT "id", "title", "section", "url", "excerpt"
    FROM "AssistantSource"
    CROSS JOIN to_tsquery('russian', ${terms}) AS query
    WHERE (setweight(to_tsvector('russian', "excerpt"), 'A') ||
           setweight(to_tsvector('russian', "title"), 'B')) @@ query
    ORDER BY ts_rank(
      setweight(to_tsvector('russian', "excerpt"), 'A') ||
      setweight(to_tsvector('russian', "title"), 'B'), query
    ) DESC, "updatedAt" DESC
    LIMIT 12
  `;
}
