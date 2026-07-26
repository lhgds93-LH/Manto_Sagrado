import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions, maxAge: 0 });
  response.headers.set("cache-control", "no-store");
  return response;
}
