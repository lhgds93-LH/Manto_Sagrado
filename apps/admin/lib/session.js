import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "manto_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function sessionSecret() {
  const value = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET deve possuir pelo menos 32 caracteres.");
  }
  return value;
}

function sign(value) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function safePasswordEqual(received, expected) {
  const left = createHmac("sha256", "manto-admin-password").update(String(received || "")).digest();
  const right = createHmac("sha256", "manto-admin-password").update(String(expected || "")).digest();
  return timingSafeEqual(left, right);
}

export function createSessionToken() {
  const payload = Buffer.from(JSON.stringify({
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    nonce: randomBytes(12).toString("base64url"),
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token) {
  try {
    const [payload, signature] = String(token || "").split(".");
    if (!payload || !signature) return false;
    const expected = sign(payload);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed?.role === "admin" && Number(parsed?.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" && process.env.ADMIN_COOKIE_SECURE !== "false",
  sameSite: "strict",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
