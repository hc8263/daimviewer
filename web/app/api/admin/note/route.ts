import { NextRequest, NextResponse } from "next/server";
import { sql, hasDb } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }
  if (!hasDb || !sql) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const wipsonKey = body?.wipsonKey as string | undefined;
  const adminNote = (body?.adminNote ?? null) as string | null;
  if (!wipsonKey) {
    return NextResponse.json({ error: "wipsonKey required" }, { status: 400 });
  }
  try {
    await sql`
      update patents set admin_note = ${adminNote}, updated_at = now()
       where wipson_key = ${wipsonKey}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
