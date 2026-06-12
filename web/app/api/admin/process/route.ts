import { NextRequest, NextResponse } from "next/server";
import { sql, hasDb } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import {
  geminiGenerate,
  splitIntoChunks,
  TRANSLATE_SYSTEM_PROMPT,
  SUMMARIZE_SYSTEM_PROMPT,
  EASY_SUMMARY_SYSTEM_PROMPT,
} from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 번역은 청크 단위로 순차 호출 — 출력 토큰 한도와 응답 시간의 균형점.
const TRANSLATE_CHUNK_CHARS = 12_000;
// 요약 입력 상한 (Gemini 2.5 Flash 1M 컨텍스트 내 여유 확보)
const SUMMARIZE_MAX_CHARS = 800_000;

type StatusRow = {
  seq: number | null;
  wipson_key: string;
  country: string | null;
  title: string;
  title_ko: string | null;
  created_at: string;
  is_new: boolean;
  desc_chars: number;
  desc_ko_chars: number;
  has_summary: boolean;
  has_easy: boolean;
};

// 번역·요약 대상 현황 (목록 쿼리는 본문을 내려보내지 않고 길이만 계산)
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }
  if (!hasDb || !sql) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }
  const rows = (await sql`
    select seq, wipson_key, country, title, title_ko,
           to_char(created_at, 'YYYY-MM-DD') as created_at,
           (created_at > now() - interval '7 days') as is_new,
           coalesce(length(description), 0) as desc_chars,
           coalesce(length(description_ko), 0) as desc_ko_chars,
           (summary_md is not null) as has_summary,
           (easy_summary_md is not null) as has_easy
      from patents
     order by seq asc nulls last, application_date desc nulls last
  `) as unknown as StatusRow[];
  return NextResponse.json({ ok: true, rows });
}

// 한 요청 = 특허 1건 × 작업 1개. 클라이언트가 선택 항목을 순차 호출한다.
// mode: translate(원문→한글) | summarize(명세서 중심 요약) | easy(이해하기 쉬운 ver)
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }
  if (!hasDb || !sql) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }
  const body = await req.json().catch(() => null) as { wipsonKey?: string; mode?: string } | null;
  const wipsonKey = body?.wipsonKey?.trim();
  const mode = body?.mode;
  if (!wipsonKey || (mode !== "translate" && mode !== "summarize" && mode !== "easy")) {
    return NextResponse.json({ error: "wipsonKey와 mode(translate|summarize|easy)가 필요합니다" }, { status: 400 });
  }

  const rows = (await sql`
    select wipson_key, title, title_ko, country, description, description_ko
      from patents where wipson_key = ${wipsonKey} limit 1
  `) as unknown as {
    wipson_key: string; title: string; title_ko: string | null;
    country: string | null; description: string | null; description_ko: string | null;
  }[];
  const p = rows[0];
  if (!p) return NextResponse.json({ error: "특허를 찾을 수 없습니다" }, { status: 404 });

  try {
    if (mode === "translate") {
      const src = (p.description || "").trim();
      if (!src) {
        return NextResponse.json({ error: "원문(description)이 적재되지 않아 번역할 수 없습니다" }, { status: 422 });
      }
      const chunks = splitIntoChunks(src, TRANSLATE_CHUNK_CHARS);
      const out: string[] = [];
      for (const chunk of chunks) {
        out.push(await geminiGenerate({ system: TRANSLATE_SYSTEM_PROMPT, user: chunk }));
      }
      const translated = out.join("\n");
      await sql`
        update patents set description_ko = ${translated}, updated_at = now()
         where wipson_key = ${wipsonKey}
      `;
      return NextResponse.json({
        ok: true, mode, wipsonKey,
        chunks: chunks.length, inChars: src.length, outChars: translated.length,
      });
    }

    // 요약 2종 — 한글 번역본 우선, 없으면 원문으로 요약
    let text = (p.description_ko || p.description || "").trim();
    if (!text) {
      return NextResponse.json({ error: "요약할 본문(번역문/원문)이 없습니다" }, { status: 422 });
    }
    if (text.length > SUMMARIZE_MAX_CHARS) text = text.slice(0, SUMMARIZE_MAX_CHARS);

    if (mode === "summarize") {
      // 명세서 중심 요약 → summary_md
      const user =
        `[Patent ID] ${p.wipson_key}\n` +
        `[Title] ${p.title_ko || p.title}\n\n` +
        `[Specification Text (Korean)]\n${text}`;
      const summary = await geminiGenerate({ system: SUMMARIZE_SYSTEM_PROMPT, user });
      await sql`
        update patents set summary_md = ${summary}, updated_at = now()
         where wipson_key = ${wipsonKey}
      `;
      return NextResponse.json({
        ok: true, mode, wipsonKey,
        inChars: text.length, outChars: summary.length,
      });
    }

    // mode === "easy" — 이해하기 쉬운 ver → easy_summary_md
    const user =
      `[Patent ID] ${p.wipson_key}\n` +
      `[Country] ${p.country || ""}\n` +
      `[Title] ${p.title_ko || p.title}\n\n` +
      `[Specification Text]\n${text}`;
    const easy = await geminiGenerate({ system: EASY_SUMMARY_SYSTEM_PROMPT, user, temperature: 0.4 });
    await sql`
      update patents set easy_summary_md = ${easy}, updated_at = now()
       where wipson_key = ${wipsonKey}
    `;
    return NextResponse.json({
      ok: true, mode, wipsonKey,
      inChars: text.length, outChars: easy.length,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
