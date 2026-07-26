import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function configuration() {
  const apiUrl = String(process.env.API_URL || "").trim().replace(/\/$/, "");
  const adminApiKey = String(process.env.ADMIN_API_KEY || "").trim();
  return { apiUrl, adminApiKey };
}

async function proxy(request, context) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { apiUrl, adminApiKey } = configuration();
  if (!apiUrl || !adminApiKey) {
    return NextResponse.json(
      { message: "Integração administrativa ainda não configurada." },
      { status: 503 },
    );
  }

  const params = await context.params;
  const segments = Array.isArray(params?.path) ? params.path : [];
  const relativePath = segments.join("/");
  const allowed = /^orders(?:\/[A-Za-z0-9-]+(?:\/(?:template|payment-approved|sent|tracking))?)?$/;
  if (!allowed.test(relativePath)) {
    return NextResponse.json({ message: "Rota administrativa não permitida." }, { status: 404 });
  }

  const incomingUrl = new URL(request.url);
  const target = new URL(`${apiUrl}/v1/admin/${relativePath}`);
  target.search = incomingUrl.search;

  const method = request.method || "GET";
  const headers = {
    accept: "application/json",
    "x-admin-api-key": adminApiKey,
  };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  try {
    const body = method === "GET" || method === "HEAD"
      ? undefined
      : Buffer.from(await request.arrayBuffer());
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
    const payload = await upstream.arrayBuffer();
    return new NextResponse(payload, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Falha no proxy administrativo", { target: target.href, error });
    return NextResponse.json(
      { message: "A API administrativa está temporariamente indisponível." },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
