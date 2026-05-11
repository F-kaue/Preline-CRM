import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Build na Vercel: `vercel.json` usa `cd web && next build`, mas o output tem de ficar na
  // raiz do clone para o runtime Next da Vercel (`framework: nextjs` na raiz).
  ...(process.env.VERCEL === "1" ? { distDir: "../.next" } : {}),
  // Evita rastrear lockfile errado fora da pasta `web/` em alguns ambientes (Windows).
  outputFileTracingRoot: rootDir,
};

export default nextConfig;
