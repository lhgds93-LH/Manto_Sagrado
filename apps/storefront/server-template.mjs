import { createServer } from "node:http";
import { extname } from "node:path";

const assets = __EMBEDDED_ASSETS__;
const port = Number(process.env.PORT || 8080);
const fallbackApiUrl = "https://manto-sagrado-api-geurgzus5q-uk.a.run.app";
const upstreamApiUrl = String(process.env.PUBLIC_API_URL || process.env.API_URL || fallbackApiUrl)
  .trim()
  .replace(/\/$/, "");

function requestUrlOf(requestUrl) {
  try {
    return new URL(requestUrl || "/", "http://localhost");
  } catch {
    return null;
  }
}

function resolveAssetPath(pathname) {
  if (!pathname) return null;
  if (pathname === "/") pathname = "/index.html";
  if (pathname.endsWith("/")) pathname += "index.html";
  if (assets[pathname]) return pathname;
  if (!extname(pathname) && assets[`${pathname}.html`]) return `${pathname}.html`;
  return assets["/index.html"] ? "/index.html" : null;
}

function send(response, status, contentType, body, cacheControl = "no-store", extraHeaders = {}) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  response.writeHead(status, {
    "content-type": contentType,
    "content-length": buffer.length,
    "cache-control": cacheControl,
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
    "referrer-policy": "strict-origin-when-cross-origin",
    ...extraHeaders
  });
  response.end(buffer);
}

async function readRequestBody(request, limit = 2 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error("Corpo da solicitação excede o limite permitido.");
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function proxyApi(request, response, url) {
  if (!upstreamApiUrl) {
    send(response, 503, "application/json; charset=utf-8", JSON.stringify({ message: "API de produção ainda não configurada." }));
    return;
  }

  const suffix = url.pathname.slice(4) || "/";
  const target = `${upstreamApiUrl}${suffix}${url.search}`;
  const method = request.method || "GET";
  const headers = {};

  for (const name of ["accept", "content-type", "authorization", "x-admin-api-key"]) {
    const value = request.headers[name];
    if (typeof value === "string") headers[name] = value;
  }

  try {
    const body = method === "GET" || method === "HEAD" ? undefined : await readRequestBody(request);
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual"
    });
    const payload = Buffer.from(await upstream.arrayBuffer());
    const responseHeaders = {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    };
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const location = upstream.headers.get("location");
    if (location) responseHeaders.location = location;

    response.writeHead(upstream.status, {
      "content-type": contentType,
      "content-length": payload.length,
      ...responseHeaders
    });
    if (method === "HEAD") response.end();
    else response.end(payload);
  } catch (error) {
    console.error("Falha no proxy da API", { target, error });
    send(response, 502, "application/json; charset=utf-8", JSON.stringify({ message: "A API está temporariamente indisponível." }));
  }
}

const server = createServer(async (request, response) => {
  const url = requestUrlOf(request.url);
  const pathname = url?.pathname || null;

  if (pathname === "/healthz") {
    send(response, 200, "application/json; charset=utf-8", JSON.stringify({
      status: "ok",
      service: "manto-sagrado-storefront",
      apiConfigured: Boolean(upstreamApiUrl),
      build: "2026-07-26-api-proxy-v2"
    }));
    return;
  }

  if (pathname === "/runtime-config.js") {
    const apiUrl = upstreamApiUrl ? "/api" : "";
    send(response, 200, "text/javascript; charset=utf-8", `window.MANTO_CONFIG = { apiUrl: ${JSON.stringify(apiUrl)} };`);
    return;
  }

  if (pathname === "/api" || pathname?.startsWith("/api/")) {
    await proxyApi(request, response, url);
    return;
  }

  const assetPath = resolveAssetPath(pathname);
  const asset = assetPath ? assets[assetPath] : null;
  if (!asset) {
    send(response, 404, "text/plain; charset=utf-8", "Página não encontrada");
    return;
  }

  const body = Buffer.from(asset.body, "base64");
  const noStore = assetPath === "/index.html" || assetPath.endsWith(".js");
  response.writeHead(200, {
    "content-type": asset.contentType,
    "content-length": body.length,
    "cache-control": noStore ? "no-store" : "public, max-age=300",
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
    "referrer-policy": "strict-origin-when-cross-origin"
  });
  if (request.method === "HEAD") response.end();
  else response.end(body);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Manto Sagrado disponível na porta ${port}; proxy da API: ${upstreamApiUrl ? "configurado" : "desativado"}`);
});
