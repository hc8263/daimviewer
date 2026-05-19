import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { sql, hasDb } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELD_ALIASES: Record<string, string[]> = {
  wipson_key:       ["wipson on key", "wipsonkey", "wipson key", "wipson_on_key"],
  country:          ["국가", "country", "국가코드"],
  title:            ["발명의명칭", "발명의 명칭", "title", "명칭"],
  title_ko:         ["발명의명칭(국문)", "title_ko", "명칭(국문)"],
  application_no:   ["출원번호", "application no", "application_no", "출원번호(국가)"],
  application_date: ["출원일자", "출원일", "application date"],
  publication_no:   ["공개번호", "publication no", "공개공고번호"],
  registration_no:  ["등록번호", "registration no"],
  applicants:       ["출원인", "applicants", "current_assignee", "출원인(국문)"],
  inventors:        ["발명자", "inventors", "발명자(국문)"],
  ipc_main:         ["ipc메인", "ipc 메인", "ipc", "ipc_main", "주ipc"],
  status:           ["분류", "상태", "status", "category"],
};

function norm(s: string) {
  return s.toString().toLowerCase().replace(/[\s_\-\.]+/g, "").trim();
}

function buildHeaderMap(headers: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  const normed = headers.map((h) => norm(String(h)));
  for (const [col, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const a of aliases) {
      const idx = normed.indexOf(norm(a));
      if (idx >= 0) { out[col] = idx; break; }
    }
  }
  return out;
}

function toDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return null;
  // YYYYMMDD / YYYY-MM-DD / YYYY.MM.DD
  const m = s.match(/^(\d{4})[\-\.\/]?(\d{2})[\-\.\/]?(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // Excel serial number
  if (/^\d+(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (serial > 20000 && serial < 80000) {
      const d = XLSX.SSF.parse_date_code(serial);
      if (d) return `${String(d.y).padStart(4, "0")}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
  }
  return s;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }
  if (!hasDb || !sql) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  let wb: XLSX.WorkBook;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  } catch (err) {
    return NextResponse.json({ error: `xlsx 파싱 실패: ${(err as Error).message}` }, { status: 400 });
  }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    return NextResponse.json({ error: "시트가 비어있습니다" }, { status: 400 });
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1, raw: false, defval: "" }) as unknown as unknown[][];
  if (rows.length < 2) {
    return NextResponse.json({ error: "데이터 행이 없습니다" }, { status: 400 });
  }
  const headers = rows[0].map((h) => String(h));
  const map = buildHeaderMap(headers);
  if (map.wipson_key == null) {
    return NextResponse.json({ error: `WIPSON Key 컬럼을 찾을 수 없습니다. 헤더: ${headers.join(", ")}` }, { status: 400 });
  }

  let inserted = 0, updated = 0;
  const warnings: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const get = (k: string) => map[k] != null ? r[map[k]] : null;
    const wipsonKey = String(get("wipson_key") || "").trim();
    if (!wipsonKey) continue;
    const title = String(get("title") || "").trim();
    if (!title) {
      warnings.push(`행 ${i + 1}: 발명의 명칭이 비어 있습니다 (${wipsonKey})`);
    }
    const vals: Record<string, string | null> = {
      country: String(get("country") || "").trim() || null,
      title: title || wipsonKey,
      title_ko: (String(get("title_ko") || "").trim()) || null,
      application_no: String(get("application_no") || "").trim() || null,
      application_date: toDate(get("application_date")),
      publication_no: String(get("publication_no") || "").trim() || null,
      registration_no: String(get("registration_no") || "").trim() || null,
      applicants: String(get("applicants") || "").trim() || null,
      inventors: String(get("inventors") || "").trim() || null,
      ipc_main: String(get("ipc_main") || "").trim() || null,
      status: String(get("status") || "").trim() || null,
    };

    try {
      const existing = (await sql`
        select 1 from patents where wipson_key = ${wipsonKey} limit 1
      `) as unknown as unknown[];
      const isNew = existing.length === 0;
      await sql`
        insert into patents (
          wipson_key, country, title, title_ko,
          application_no, application_date, publication_no, registration_no,
          applicants, inventors, ipc_main, status, updated_at
        ) values (
          ${wipsonKey}, ${vals.country}, ${vals.title}, ${vals.title_ko},
          ${vals.application_no}, ${vals.application_date}, ${vals.publication_no}, ${vals.registration_no},
          ${vals.applicants}, ${vals.inventors}, ${vals.ipc_main}, ${vals.status}, now()
        )
        on conflict (wipson_key) do update set
          country = coalesce(excluded.country, patents.country),
          title = excluded.title,
          title_ko = coalesce(excluded.title_ko, patents.title_ko),
          application_no = coalesce(excluded.application_no, patents.application_no),
          application_date = coalesce(excluded.application_date::date, patents.application_date),
          publication_no = coalesce(excluded.publication_no, patents.publication_no),
          registration_no = coalesce(excluded.registration_no, patents.registration_no),
          applicants = coalesce(excluded.applicants, patents.applicants),
          inventors = coalesce(excluded.inventors, patents.inventors),
          ipc_main = coalesce(excluded.ipc_main, patents.ipc_main),
          status = coalesce(excluded.status, patents.status),
          updated_at = now()
      `;
      if (isNew) inserted++; else updated++;
    } catch (err) {
      warnings.push(`행 ${i + 1} (${wipsonKey}): ${(err as Error).message}`);
    }
  }

  return NextResponse.json({ ok: true, inserted, updated, warnings });
}
