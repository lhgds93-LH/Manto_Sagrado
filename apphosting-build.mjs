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

const root = fileURLToPath(new URL(".", import.meta.url));
const source = resolve(root, "apps/storefront/static");
const output = resolve(root, "server.mjs");
const legacyDist = resolve(root, "dist");

if (!existsSync(source)) {
  throw new Error("Pasta apps/storefront/static não encontrada");
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

if (!assets["/index.html"]) {
  throw new Error("Build inválido: apps/storefront/static/index.html não encontrado");
}

const runtime = `import { createServer } from "node:http";
import { extname } from "node:path";

const assets = ${JSON.stringify(assets)};
const port = Number(process.env.PORT || 8080);

function pathnameOf(requestUrl) {
  try {
    return decodeURIComponent(new URL(requestUrl || "/", "http://localhost").pathname);
  } catch {
    return null;
  }
}

function resolveAssetPath(pathname) {
  if (!pathname) return null;
  if (pathname === "/") pathname = "/index.html";
  if (pathname.endsWith("/")) pathname += "index.html";
  if (assets[pathname]) return pathname;
  if (!extname(pathname) && assets[\`${"${pathname}"}.html\`]) return \`${"${pathname}"}.html\`;
  return assets["/index.html"] ? "/index.html" : null;
}

function send(response, status, contentType, body, cacheControl = "no-store") {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  response.writeHead(status, {
    "content-type": contentType,
    "content-length": buffer.length,
    "cache-control": cacheControl,
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
    "referrer-policy": "strict-origin-when-cross-origin"
  });
  response.end(buffer);
}

const server = createServer((request, response) => {
  const pathname = pathnameOf(request.url);

  if (pathname === "/healthz") {
    send(response, 200, "application/json; charset=utf-8", JSON.stringify({ status: "ok", service: "manto-sagrado-storefront" }));
    return;
  }

  if (pathname === "/runtime-config.js") {
    const apiUrl = String(process.env.PUBLIC_API_URL || process.env.API_URL || "").trim().replace(/\\\/$/, "");
    send(response, 200, "text/javascript; charset=utf-8", \`window.MANTO_CONFIG = { apiUrl: \${JSON.stringify(apiUrl)} };\`);
    return;
  }

  const assetPath = resolveAssetPath(pathname);
  const asset = assetPath ? assets[assetPath] : null;
  if (!asset) {
    send(response, 404, "text/plain; charset=utf-8", "Página não encontrada");
    return;
  }

  const body = Buffer.from(asset.body, "base64");
  response.writeHead(200, {
    "content-type": asset.contentType,
    "content-length": body.length,
    "cache-control": assetPath === "/index.html" ? "public, max-age=0, must-revalidate" : "public, max-age=300",
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
    "referrer-policy": "strict-origin-when-cross-origin"
  });
  if (request.method === "HEAD") response.end();
  else response.end(body);
});

server.listen(port, "0.0.0.0", () => {
  console.log(\`Manto Sagrado disponível na porta ${"${port}"}\`);
});
`;

rmSync(legacyDist, { recursive: true, force: true });
writeFileSync(output, runtime, "utf8");
console.log(`Build concluído: ${Object.keys(assets).length} arquivos incorporados em server.mjs`);
