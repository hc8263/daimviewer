import { NextRequest, NextResponse } from "next/server";
import { sql, hasDb } from "@/lib/db";

export const runtime = "nodejs";

type Body = {
  wipsonKey?: string;
  reviewer?: string;
  decision?: string | null;
  note?: string | null;
  excluded?: boolean;
  wipsonKeys?: string[]; // bulk update
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const reviewer = body?.reviewer || "USER";
  const keys = body?.wipsonKeys && Array.isArray(body.wipsonKeys)
    ? body.wipsonKeys
    : body?.wipsonKey
    ? [body.wipsonKey]
    : [];
  if (!keys.length || !reviewer) {
    return NextResponse.json({ error: "wipsonKey(s) and reviewer required" }, { status: 400 });
  }
  const { decision, note, excluded } = body!;
  const decisionProvided = body !== null && Object.prototype.hasOwnProperty.call(body, "decision");
  if (decisionProvided && decision != null && !["relevant", "maybe", "irrelevant"].includes(decision)) {
    return NextResponse.json({ error: "invalid decision" }, { status: 400 });
  }
  if (!hasDb || !sql) {
    return NextResponse.json({ ok: true, persisted: false });
  }
  try {
    // Upsert per key; only set fields that were provided.
    for (const k of keys) {
      await sql`
        insert into reviews (wipson_key, reviewer, decision, note, excluded, updated_at)
        values (
          ${k}, ${reviewer},
          ${decisionProvided ? (decision ?? null) : null}, ${note ?? null},
          ${excluded ?? false}, now()
        )
        on conflict (wipson_key, reviewer) do update set
          decision = case when ${decisionProvided} then ${decision ?? null} else reviews.decision end,
          note     = case when ${note === undefined} then reviews.note else ${note ?? null} end,
          excluded = case when ${excluded === undefined} then reviews.excluded else ${excluded ?? false} end,
          updated_at = now()
      `;
    }
    return NextResponse.json({ ok: true, persisted: true, count: keys.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
