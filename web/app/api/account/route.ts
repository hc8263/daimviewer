import { NextRequest, NextResponse } from "next/server";
import { hasDb, sql } from "@/lib/db";
import { isReviewer } from "@/lib/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoginBody = {
  reviewer?: string;
  password?: string;
};

type ChangeBody = LoginBody & {
  nextPassword?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as LoginBody | null;
  const reviewer = body?.reviewer;
  const password = body?.password ?? "";
  if (!isReviewer(reviewer)) {
    return NextResponse.json({ error: "invalid reviewer" }, { status: 400 });
  }
  if (!hasDb || !sql) {
    return NextResponse.json({ ok: password === "1" }, { status: password === "1" ? 200 : 401 });
  }
  const rows = (await sql`
    select password from reviewer_accounts where reviewer = ${reviewer} limit 1
  `) as unknown as { password: string }[];
  if (rows[0]?.password !== password) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, reviewer });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as ChangeBody | null;
  const reviewer = body?.reviewer;
  const password = body?.password ?? "";
  const nextPassword = body?.nextPassword ?? "";
  if (!isReviewer(reviewer)) {
    return NextResponse.json({ error: "invalid reviewer" }, { status: 400 });
  }
  if (!nextPassword.trim()) {
    return NextResponse.json({ error: "새 비밀번호를 입력해주세요" }, { status: 400 });
  }
  if (!hasDb || !sql) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }
  const rows = (await sql`
    select password from reviewer_accounts where reviewer = ${reviewer} limit 1
  `) as unknown as { password: string }[];
  if (rows[0]?.password !== password) {
    return NextResponse.json({ error: "현재 비밀번호가 일치하지 않습니다" }, { status: 401 });
  }
  await sql`
    update reviewer_accounts
       set password = ${nextPassword}, updated_at = now()
     where reviewer = ${reviewer}
  `;
  return NextResponse.json({ ok: true, reviewer });
}
