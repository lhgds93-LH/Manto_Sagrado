import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  createSessionToken,
  safePasswordEqual,
} from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const expected = process.env.ADMIN_PANEL_PASSWORD?.trim();
  if (!expected) {
    return NextResponse.json(
      { message: "Senha administrativa ainda não configurada." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body?.password === "string" ? body.password : "";

  if (!safePasswordEqual(password, expected)) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return NextResponse.json({ message: "Credenciais inválidas." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ADMIN_COOKIE, createSessionToken(), adminCookieOptions);
  response.headers.set("cache-control", "no-store");
  return response;
}
