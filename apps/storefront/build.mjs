import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const base = fileURLToPath(new URL(".", import.meta.url));
const source = resolve(base, "static");
const output = resolve(base, "out");

if (!existsSync(source)) {
  throw new Error("Pasta static não encontrada");
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(source, output, { recursive: true });

if (!existsSync(resolve(output, "index.html"))) {
  throw new Error("Build inválido: out/index.html não foi gerado");
}

console.log("Build estático concluído em apps/storefront/out");
