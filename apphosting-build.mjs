import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const source = resolve(root, "apps/storefront/static");
const output = resolve(root, "dist");

if (!existsSync(source)) {
  throw new Error("Pasta apps/storefront/static não encontrada");
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(source, output, { recursive: true });

if (!existsSync(resolve(output, "index.html"))) {
  throw new Error("Build inválido: dist/index.html não foi gerado");
}

console.log("Build do App Hosting concluído em /dist");
