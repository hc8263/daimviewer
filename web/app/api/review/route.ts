import { NextRequest, NextResponse } from "next/server";
import { sql, hasDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.wipsonKey || !body?.reviewer || !body?.decision) {
    return NextResponse.json({ error: "wipsonKey, reviewer, decision required" }, { status: 400 });
  }
  const { wipsonKey, reviewer, decision, note } = body as {
    wipsonKey: string; reviewer: string; decision: string; note?: string;
  };
  if (!["relevant", "maybe", "irrelevant"].includes(decision)) {
    return NextResponse.json({ error: "invalid decision" }, { status: 400 });
  }
  if (!hasDb || !sql) {
    // No DB yet — accept silently so the UI can run on mock data.
    return NextResponse.json({ ok: true, persisted: false });
  }
  try {
    await sql`
      insert into reviews (wipson_key, reviewer, decision, note, updated_at)
      values (${wipsonKey}, ${reviewer}, ${decision}, ${note ?? null}, now())
      on conflict (wipson_key, reviewer)
      do update set decision = excluded.decision, note = excluded.note, updated_at = now()
    `;
    return NextResponse.json({ ok: true, persisted: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
