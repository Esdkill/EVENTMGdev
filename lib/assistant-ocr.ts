import { mkdtemp, rm, symlink } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const packageRequire = createRequire(join(process.cwd(), "package.json"));
const resolvePackage = packageRequire.resolve.bind(packageRequire);

export async function createKnowledgeOcr() {
  const { createWorker, OEM } = await import("tesseract.js");
  const eng = dirname(resolvePackage("@tesseract.js-data/eng"));
  const rus = dirname(resolvePackage("@tesseract.js-data/rus"));
  const langPath = await mkdtemp(join(tmpdir(), "deanery-ocr-"));
  try {
    await Promise.all([
      symlink(join(eng, "4.0.0_best_int", "eng.traineddata.gz"), join(langPath, "eng.traineddata.gz")),
      symlink(join(rus, "4.0.0_best_int", "rus.traineddata.gz"), join(langPath, "rus.traineddata.gz")),
    ]);
    return await createWorker("rus+eng", OEM.LSTM_ONLY, { langPath, cacheMethod: "none" });
  } finally {
    await rm(langPath, { recursive: true, force: true });
  }
}
