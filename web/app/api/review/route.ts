import { NextRequest, NextResponse } from "next/server";
import { sql, hasDb } from "@/lib/db";
import { isReviewCategory, isReviewDecision, isReviewer } from "@/lib/review";

export const runtime = "nodejs";

type Body = {
  wipsonKey?: string;
  reviewer?: string;
  decision?: string | null;
  reviewCategory?: string | null;
  note?: string | null;
  excluded?: boolean;
  wipsonKeys?: string[]; // bulk update
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const reviewer = body?.reviewer || "HW";
  const keys = body?.wipsonKeys && Array.isArray(body.wipsonKeys)
    ? body.wipsonKeys
    : body?.wipsonKey
    ? [body.wipsonKey]
    : [];
  if (!keys.length || !reviewer) {
    return NextResponse.json({ error: "wipsonKey(s) and reviewer required" }, { status: 400 });
  }
  if (!isReviewer(reviewer)) {
    return NextResponse.json({ error: "invalid reviewer" }, { status: 400 });
  }
  const { decision, reviewCategory, note, excluded } = body!;
  const decisionProvided = body !== null && Object.prototype.hasOwnProperty.call(body, "decision");
  const categoryProvided = body !== null && Object.prototype.hasOwnProperty.call(body, "reviewCategory");
  if (decisionProvided && decision != null && !isReviewDecision(decision)) {
    return NextResponse.json({ error: "invalid decision" }, { status: 400 });
  }
  if (categoryProvided && reviewCategory != null && !isReviewCategory(reviewCategory)) {
    return NextResponse.json({ error: "invalid reviewCategory" }, { status: 400 });
  }
  if (!hasDb || !sql) {
    return NextResponse.json({ ok: true, persisted: false });
  }
  try {
    // Upsert per key; only set fields that were provided.
    for (const k of keys) {
      await sql`
        insert into reviews (wipson_key, reviewer, decision, review_category, note, excluded, updated_at)
        values (
          ${k}, ${reviewer},
          ${decisionProvided ? (decision ?? null) : null},
          ${categoryProvided ? (reviewCategory ?? null) : null},
          ${note ?? null},
          ${excluded ?? false}, now()
        )
        on conflict (wipson_key, reviewer) do update set
          decision = case when ${decisionProvided} then ${decision ?? null} else reviews.decision end,
          review_category = case when ${categoryProvided} then ${reviewCategory ?? null} else reviews.review_category end,
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
