// Minimal admin auth: a single shared password via env, stored in an
// httpOnly cookie. Intentionally simple — internal tool only.
import { cookies } from "next/headers";
import crypto from "node:crypto";

const COOKIE = "daimviewer_admin";

function tokenFor(pw: string): string {
  return crypto.createHash("sha256").update(pw).digest("hex");
}

export function expectedToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  return pw ? tokenFor(pw) : null;
}

export async function isAdmin(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return false;
  const c = await cookies();
  return c.get(COOKIE)?.value === expected;
}

export const ADMIN_COOKIE = COOKIE;

export function tokenFromPassword(pw: string): string {
  return tokenFor(pw);
}
