import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { knowledgeFileLimitMb } from "./lib/assistant-knowledge-limits";

const root = fileURLToPath(new URL(".", import.meta.url));
const config: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: `${knowledgeFileLimitMb + 1}mb` } },
  serverExternalPackages: ["tesseract.js", "@tesseract.js-data/eng", "@tesseract.js-data/rus", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/profile/avatar": ["./public/avatars/*.webp"],
    "/staff/assistant": ["./node_modules/@tesseract.js-data/*/4.0.0_best_int/*.traineddata.gz"],
  },
  outputFileTracingRoot: root,
  turbopack: { root },
};

export default config;
