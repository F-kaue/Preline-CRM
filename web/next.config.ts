import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Na Vercel o repo está na raiz, app em `web/`. Build: `cd web && next build`.
  // Caminho relativo: output em `<repo>/.next` para o runtime na raiz encontrar.
  ...(process.env.VERCEL === "1" ? { distDir: "../.next" } : {}),
  // Evita rastrear lockfile errado fora da pasta `web/` em alguns ambientes (Windows).
  outputFileTracingRoot: rootDir,
};

export default nextConfig;
