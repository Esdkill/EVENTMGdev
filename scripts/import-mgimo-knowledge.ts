import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readKnowledgeDocument } from "../lib/assistant-knowledge";
import { db } from "../lib/db";

// Original PDFs listed in the official register at https://mgimo.ru/sveden/document/.
const documents = [
  ["000453", "Положение о проведении текущего контроля обучающихся МГИМО"],
  ["004776", "Положение о промежуточной аттестации обучающихся МГИМО"],
  ["004777", "Положение об организации образовательной деятельности в МГИМО"],
  ["000457", "Правила внутреннего распорядка обучающихся МГИМО"],
  ["003143", "Порядок перевода обучающихся в МГИМО"],
] as const;

async function importDocuments(directory: string) {
  for (const [number, title] of documents) {
    const content = await readFile(join(directory, number + ".pdf"));
    const checksum = createHash("sha256").update(content).digest("hex");
    const existing = await db.assistantDocument.findUnique({
      where: { checksum },
      select: { id: true, _count: { select: { sources: true } } },
    });
    if (existing?._count.sources) {
      console.log(`${title} · уже в базе`);
      continue;
    }

    const { sources, ...document } = await readKnowledgeDocument(
      new File([new Uint8Array(content)], title + ".pdf"),
      `https://mgimo.ru/sveden/files/${number}.pdf`,
    );
    const indexedPages = new Set(sources.filter(source => (source.excerpt.match(/[А-ЯЁа-яё]/g)?.length ?? 0) >= 50)
      .map(source => source.section));
    if (indexedPages.size < 2) throw new Error(`Документ «${title}» не прошёл проверку качества распознавания.`);

    await db.assistantDocument.upsert({
      where: { checksum },
      create: { ...document, checksum, sources: { createMany: { data: sources } } },
      update: existing ? { sources: { createMany: { data: sources } } } : {},
    });
    console.log(`${title} · ${indexedPages.size} стр. · ${sources.length} фрагментов`);
  }
}

const directory = process.argv[2];
try {
  if (!directory) throw new Error("Укажите каталог с оригинальными PDF из реестра МГИМО.");
  await importDocuments(directory);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Не удалось импортировать документы.");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
