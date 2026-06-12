import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { sql, hasDb } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const FIELD_ALIASES: Record<string, string[]> = {
  wipson_key:       ["wips on key", "wipson on key", "wipsonkey", "wipson key", "wipson_on_key"],
  country:          ["국가", "country", "국가코드"],
  title:            ["발명의명칭", "발명의 명칭", "title", "명칭"],
  title_ko:         ["발명의 명칭-번역문", "발명의명칭(국문)", "title_ko", "명칭(국문)"],
  application_no:   ["출원번호", "application no", "application_no", "출원번호(국가)"],
  application_date: ["출원일자", "출원일", "application date"],
  publication_no:   ["공개번호", "publication no", "공개공고번호"],
  registration_no:  ["등록번호", "registration no"],
  applicants:       ["출원인", "applicants", "current_assignee", "출원인(국문)"],
  inventors:        ["발명자", "inventors", "발명자(국문)"],
  ipc_main:         ["ipc메인", "ipc 메인", "ipc", "ipc_main", "주ipc", "current ipc main"],
  status:           ["분류", "상태", "status", "category", "기술분류1차"],
  major_category:   ["대분류", "major_category"],
  middle_category:  ["중분류", "middle_category"],
  source_url:       ["상세보기 링크(비로그인)", "상세보기링크", "source_url"],
  pdf_url:          ["원문(pdf)링크", "원문pdf링크", "pdf_url", "원문링크"],
};

const FIELD_LABELS: Record<string, string> = {
  wipson_key: "WIPS ON Key", country: "국가", title: "발명의 명칭(원문)",
  title_ko: "발명의 명칭(국문)", application_no: "출원번호", application_date: "출원일",
  publication_no: "공개번호", registration_no: "등록번호", applicants: "출원인",
  inventors: "발명자", ipc_main: "IPC 메인", status: "분류",
  major_category: "대분류", middle_category: "중분류",
  source_url: "상세보기 링크", pdf_url: "원문(PDF) 링크",
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

// 데이터가 첫 시트에 없거나(예: WIPS ON 다운로드 파일은 '다운로드' 시트)
// 헤더가 첫 행이 아닌 경우가 있어, 전 시트 × 앞 10행에서 WIPS ON Key
// 헤더를 탐색해 (시트, 헤더행, 매핑)을 자동으로 찾는다.
function findDataSheet(wb: XLSX.WorkBook): {
  sheetName: string; headerRowIdx: number; headers: string[];
  map: Record<string, number>; rows: unknown[][];
} | null {
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1, raw: false, defval: "" }) as unknown as unknown[][];
    const scanLimit = Math.min(rows.length, 10);
    for (let i = 0; i < scanLimit; i++) {
      const headers = (rows[i] || []).map((h) => String(h));
      const map = buildHeaderMap(headers);
      if (map.wipson_key != null && map.title != null) {
        return { sheetName, headerRowIdx: i, headers, map, rows };
      }
    }
  }
  return null;
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
  const found = findDataSheet(wb);
  if (!found) {
    return NextResponse.json({
      error: `WIPS ON Key / 발명의 명칭 헤더를 가진 시트를 찾을 수 없습니다. 시트: ${wb.SheetNames.join(", ")}`,
    }, { status: 400 });
  }
  const { sheetName, headerRowIdx, headers, map, rows } = found;
  if (rows.length <= headerRowIdx + 1) {
    return NextResponse.json({ error: "데이터 행이 없습니다" }, { status: 400 });
  }

  // 사용자에게 보여줄 매핑 결과: DB 필드 ← 엑셀 헤더
  const mapping: { field: string; label: string; header: string }[] = Object.entries(map)
    .map(([field, idx]) => ({ field, label: FIELD_LABELS[field] || field, header: headers[idx] }));
  const missing = Object.keys(FIELD_ALIASES)
    .filter((f) => map[f] == null)
    .map((f) => FIELD_LABELS[f] || f);

  // 중복 검사: DB의 기존 키를 한 번에 조회
  const existingRows = (await sql`select wipson_key from patents`) as unknown as { wipson_key: string }[];
  const existingKeys = new Set(existingRows.map((r) => r.wipson_key));

  let inserted = 0, updated = 0, duplicateInFile = 0;
  const insertedKeys: string[] = [];
  const warnings: string[] = [];
  const seenInFile = new Set<string>();

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const get = (k: string) => map[k] != null ? r[map[k]] : null;
    const wipsonKey = String(get("wipson_key") || "").trim();
    if (!wipsonKey) continue;
    if (seenInFile.has(wipsonKey)) {
      duplicateInFile++;
      warnings.push(`행 ${i + 1}: 파일 내 중복 키 — 건너뜀 (${wipsonKey})`);
      continue;
    }
    seenInFile.add(wipsonKey);
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
      major_category: String(get("major_category") || "").trim() || null,
      middle_category: String(get("middle_category") || "").trim() || null,
      source_url: String(get("source_url") || "").trim() || null,
      pdf_url: String(get("pdf_url") || "").trim() || null,
    };

    try {
      const isNew = !existingKeys.has(wipsonKey);
      // seq는 insert 시점에만 max+1로 명시 할당한다. 갱신(conflict) 시 seq를
      // 건드리지 않으므로 기존 넘버링이 보존되고, 신규 행은 목록 맨 뒤 번호를
      // 이어받는다. (컬럼 default nextval에 맡기면 upsert가 충돌 행에서도
      // 시퀀스를 소모해 번호가 점프하므로 사용하지 않는다.)
      await sql`
        insert into patents (
          wipson_key, seq, country, title, title_ko,
          application_no, application_date, publication_no, registration_no,
          applicants, inventors, ipc_main, status,
          major_category, middle_category, source_url, pdf_url, updated_at
        ) values (
          ${wipsonKey}, (select coalesce(max(seq), 0) + 1 from patents), ${vals.country}, ${vals.title}, ${vals.title_ko},
          ${vals.application_no}, ${vals.application_date}, ${vals.publication_no}, ${vals.registration_no},
          ${vals.applicants}, ${vals.inventors}, ${vals.ipc_main}, ${vals.status},
          ${vals.major_category}, ${vals.middle_category}, ${vals.source_url}, ${vals.pdf_url}, now()
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
          major_category = coalesce(excluded.major_category, patents.major_category),
          middle_category = coalesce(excluded.middle_category, patents.middle_category),
          source_url = coalesce(excluded.source_url, patents.source_url),
          pdf_url = coalesce(excluded.pdf_url, patents.pdf_url),
          updated_at = now()
      `;
      if (isNew) { inserted++; insertedKeys.push(wipsonKey); } else { updated++; }
    } catch (err) {
      warnings.push(`행 ${i + 1} (${wipsonKey}): ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    sheet: sheetName,
    headerRow: headerRowIdx + 1,
    mapping,
    missing,
    inserted,
    updated,
    duplicateInFile,
    insertedKeys,
    warnings,
  });
}
