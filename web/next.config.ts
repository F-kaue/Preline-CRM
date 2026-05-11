import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Evita rastrear lockfile errado fora da pasta `web/` em alguns ambientes (Windows).
  outputFileTracingRoot: rootDir,
};

export default nextConfig;
