import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, tokenFromPassword } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_PASSWORD가 설정되지 않았습니다" }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const pw = body?.password as string | undefined;
  if (!pw || pw !== expected) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, tokenFromPassword(pw), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
