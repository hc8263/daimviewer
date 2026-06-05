import { NextRequest, NextResponse } from "next/server";
import { sql, hasDb } from "@/lib/db";

export const runtime = "nodejs";

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const DECISION_LABEL: Record<string, string> = {
  relevant: "S등급",
  maybe: "A등급",
  irrelevant: "B등급",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const keys: string[] = Array.isArray(body?.wipsonKeys) ? body.wipsonKeys : [];
  return runExport(keys);
}

export async function GET() {
  return runExport([]);
}

async function runExport(keys: string[]) {
  if (!hasDb || !sql) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }
  // keys 주어지면 그 키들만, 아니면 excluded=false 전체
  const rows = (keys.length > 0
    ? await sql`
        select p.wipson_key, p.country, p.title, p.title_ko,
               p.application_no,
               to_char(p.application_date, 'YYYY-MM-DD') as application_date,
               p.publication_no, p.registration_no,
               p.applicants, p.inventors, p.ipc_main, p.status,
               r.decision, r.note, r.reviewer,
               to_char(r.updated_at, 'YYYY-MM-DD') as review_date
          from patents p
          left join lateral (
            select decision, note, reviewer, updated_at, excluded
              from reviews
             where reviews.wipson_key = p.wipson_key
             order by updated_at desc
             limit 1
          ) r on true
          where p.wipson_key = any(${keys})
          order by p.application_date desc nulls last
      `
    : await sql`
        select p.wipson_key, p.country, p.title, p.title_ko,
               p.application_no,
               to_char(p.application_date, 'YYYY-MM-DD') as application_date,
               p.publication_no, p.registration_no,
               p.applicants, p.inventors, p.ipc_main, p.status,
               r.decision, r.note, r.reviewer,
               to_char(r.updated_at, 'YYYY-MM-DD') as review_date
          from patents p
          left join lateral (
            select decision, note, reviewer, updated_at, excluded
              from reviews
             where reviews.wipson_key = p.wipson_key
             order by updated_at desc
             limit 1
          ) r on true
          where coalesce(r.excluded, false) = false
          order by p.application_date desc nulls last
      `) as unknown as Array<{
    wipson_key: string; country: string | null; title: string | null; title_ko: string | null;
    application_no: string | null; application_date: string | null;
    publication_no: string | null; registration_no: string | null;
    applicants: string | null; inventors: string | null;
    ipc_main: string | null; status: string | null;
    decision: string | null; note: string | null;
    reviewer: string | null; review_date: string | null;
  }>;

  const headers = [
    "WIPSONKEY", "국가", "발명의명칭", "발명의명칭(KO)",
    "출원번호", "출원일자", "공개번호", "등록번호",
    "출원인", "발명자", "IPC메인", "분류",
    "등급", "코멘트", "검토자", "검토일",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.wipson_key, r.country, r.title, r.title_ko,
      r.application_no, r.application_date,
      r.publication_no, r.registration_no,
      r.applicants, r.inventors, r.ipc_main, r.status,
      r.decision ? (DECISION_LABEL[r.decision] || r.decision) : "",
      r.note, r.reviewer, r.review_date,
    ].map(csvEscape).join(","));
  }
  // UTF-8 BOM for Excel-friendly Korean
  const body = "﻿" + lines.join("\r\n");
  const ts = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="daimviewer-export-${ts}.csv"`,
    },
  });
}
