import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("./out", import.meta.url)));
const port = Number(process.env.PORT ?? 8080);

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
  ".woff2": "font/woff2",
};

function resolveRequestPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = normalize(decoded).replace(/^([/\\])+/, "");
  let candidate = resolve(join(root, relative));

  if (!candidate.startsWith(root)) return null;

  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    candidate = join(candidate, "index.html");
  }

  if (!existsSync(candidate) && !extname(candidate)) {
    const htmlCandidate = `${candidate}.html`;
    if (existsSync(htmlCandidate)) candidate = htmlCandidate;
  }

  if (!existsSync(candidate)) {
    const fallback = join(root, "404.html");
    candidate = existsSync(fallback) ? fallback : join(root, "index.html");
  }

  return candidate.startsWith(root) ? candidate : null;
}

const server = createServer((request, response) => {
  try {
    const filePath = resolveRequestPath(request.url ?? "/");

    if (!filePath || !existsSync(filePath)) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Página não encontrada");
      return;
    }

    const extension = extname(filePath).toLowerCase();
    const immutable = filePath.includes(`${join("_next", "static")}`);

    response.writeHead(200, {
      "content-type": mimeTypes[extension] ?? "application/octet-stream",
      "cache-control": immutable
        ? "public, max-age=31536000, immutable"
        : "public, max-age=0, must-revalidate",
      "x-content-type-options": "nosniff",
      "x-frame-options": "SAMEORIGIN",
      "referrer-policy": "strict-origin-when-cross-origin",
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(filePath).pipe(response);
  } catch (error) {
    console.error("Falha ao servir a loja", error);
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Erro interno");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Manto Sagrado disponível na porta ${port}`);
});
