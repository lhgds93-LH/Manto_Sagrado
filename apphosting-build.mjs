import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

const root = fileURLToPath(new URL(".", import.meta.url));
const source = resolve(root, "apps/storefront/static");
const templatePath = resolve(root, "apps/storefront/server-template.mjs");
const output = resolve(root, "server.mjs");
const legacyDist = resolve(root, "dist");

if (!existsSync(source)) {
  throw new Error("Pasta apps/storefront/static não encontrada");
}

if (!existsSync(templatePath)) {
  throw new Error("Modelo apps/storefront/server-template.mjs não encontrado");
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function listFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = resolve(directory, entry);
    return statSync(fullPath).isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

const assets = Object.fromEntries(
  listFiles(source).map((filePath) => {
    const publicPath = `/${relative(source, filePath).split(sep).join("/")}`;
    const extension = extname(filePath).toLowerCase();
    return [publicPath, {
      body: readFileSync(filePath).toString("base64"),
      contentType: mimeTypes[extension] || "application/octet-stream"
    }];
  })
);

for (const requiredAsset of ["/index.html", "/app.js", "/api-bootstrap.js", "/api-guard.js"]) {
  if (!assets[requiredAsset]) {
    throw new Error(`Build inválido: ${requiredAsset} não encontrado`);
  }
}

for (const [publicPath, asset] of Object.entries(assets)) {
  if (!publicPath.endsWith(".js")) continue;
  const javascript = Buffer.from(asset.body, "base64").toString("utf8");
  new Script(javascript, { filename: publicPath });
}

const indexHtml = Buffer.from(assets["/index.html"].body, "base64").toString("utf8");
if (!indexHtml.includes("api-bootstrap.js?v=20260726-2") || !indexHtml.includes("api-guard.js?v=20260726-2")) {
  throw new Error("Build inválido: scripts versionados da API não foram carregados pelo index.html");
}

const template = readFileSync(templatePath, "utf8");
const marker = "__EMBEDDED_ASSETS__";
if (!template.includes(marker)) {
  throw new Error(`Modelo inválido: marcador ${marker} não encontrado`);
}

const runtime = template.replace(marker, JSON.stringify(assets));

rmSync(legacyDist, { recursive: true, force: true });
writeFileSync(output, runtime, "utf8");
console.log(`Build concluído: ${Object.keys(assets).length} arquivos incorporados em server.mjs`);
