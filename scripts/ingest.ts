/**
 * Ingest excel (datas_list.xlsx 시트 "유효데이터") + 추출된 description 텍스트를
 * Neon Postgres 의 patents 테이블에 적재.
 *
 * 실행:
 *   cd web && ./node_modules/.bin/tsx ../scripts/ingest.ts
 *
 * DATABASE_URL 미설정시 dry-run: data/ingest_preview.json + 통계만 출력.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { Pool } from "@neondatabase/serverless";
import { hasDb, type PatentRow } from "../web/lib/db";

const ROOT = "/Users/vincentlim/coding/dmpat_patent_anal";
const XLSX_PATH = path.join(ROOT, "list/datas_list.xlsx");
const PDF_DIR = path.join(ROOT, "datas");
const DESC_DIR = path.join(ROOT, "data/descriptions");
const UNMATCHED_CSV = path.join(ROOT, "data/unmatched.csv");
const PREVIEW_JSON = path.join(ROOT, "data/ingest_preview.json");

// ──────────────────────────────────────────────────────────────────────
// 수동 매핑 (자동 매칭이 실패한 데이터 정합성 이슈용)
// ──────────────────────────────────────────────────────────────────────
//   - 6594003000766 (CN): 엑셀 출원번호 1993-10012989 vs PDF 申请号 93112989.3
//     → 엑셀 표기 차이, PDF 내용은 일치
//   - 6710007000554 (CN): 엑셀 출원번호 2002-80002997 vs PDF 申请号 02802997.6
//     → 등록번호 100592693 일치, 엑셀 표기 차이
//   - 7400007678221 (DE): WIPS가 PCT 원문(wowo85_000064a1p.pdf)으로 제공
const MANUAL_OVERRIDES: Record<string, string> = {
  "6594003000766": "cn199300112989ap.pdf",
  "6710007000554": "cn200200802997cp.pdf",
  "7400007678221": "wowo85_000064a1p.pdf",
};

// ──────────────────────────────────────────────────────────────────────
// PDF 인덱스
// ──────────────────────────────────────────────────────────────────────
type PdfEntry = { filename: string; stem: string; prefix: string; num: string };

function buildPdfIndex(): {
  // key = `${countryPrefix}:${numStripped}` → entries
  byKey: Map<string, PdfEntry[]>;
  all: PdfEntry[];
} {
  const all: PdfEntry[] = [];
  const byKey = new Map<string, PdfEntry[]>();
  const files = fs.readdirSync(PDF_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
  for (const filename of files) {
    const stem = filename.replace(/\.pdf$/i, "");
    // Match leading letters + first run of digits
    const m = stem.match(/^([A-Za-z]+)(\d+)/);
    if (!m) continue;
    const prefix = m[1].toLowerCase();
    const num = m[2];
    const entry: PdfEntry = { filename, stem, prefix, num };
    all.push(entry);
    // Index under multiple forms
    const variants = new Set<string>([num, num.replace(/^0+/, "") || num]);
    for (const v of variants) {
      const key = `${prefix}:${v}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(entry);
    }
  }
  return { byKey, all };
}

// ──────────────────────────────────────────────────────────────────────
// 매칭 후보 생성
// ──────────────────────────────────────────────────────────────────────
function numCandidates(val: unknown): string[] {
  if (val == null) return [];
  const s = String(val).trim();
  if (!s) return [];
  const out = new Set<string>();
  const allDigits = s.replace(/\D/g, "");
  if (allDigits) {
    out.add(allDigits);
    const stripped = allDigits.replace(/^0+/, "");
    if (stripped) out.add(stripped);
  }
  const parts = s.split(/[-/\s]+/).filter(Boolean);
  for (const p of parts) {
    const d = p.replace(/\D/g, "");
    if (d) {
      out.add(d);
      const stripped = d.replace(/^0+/, "");
      if (stripped) out.add(stripped);
    }
  }
  // last-two/three concatenations + extra-zero-padding between parts
  // (JP publication numbers in filenames sometimes insert an extra '0' between
  //  the year and the serial, e.g. excel "2019-070997" → filename "jp20190070997")
  if (parts.length >= 2) {
    const dp = parts.map((p) => p.replace(/\D/g, "")).filter(Boolean);
    for (let take = 2; take <= Math.min(3, dp.length); take++) {
      const slice = dp.slice(-take);
      for (const sep of ["", "0", "00"]) {
        const concat = slice.join(sep);
        if (concat) {
          out.add(concat);
          const stripped = concat.replace(/^0+/, "");
          if (stripped) out.add(stripped);
        }
      }
    }
  }
  return [...out];
}

// country routing - excel에 따라 EP/PCT/CA/AU 처리
function countryPrefixes(cc: string): string[] {
  const c = (cc || "").toUpperCase();
  switch (c) {
    case "CN": return ["cn"];
    case "JP": return ["jp"];
    case "KR": return ["kr"];
    case "US": return ["us"];
    case "DE": return ["de"];
    case "EP": return ["ep"];
    case "PCT": return ["wowo", "ep"]; // PCT 파일은 wowo 또는 EP*-wowo* 패턴
    default: return [c.toLowerCase()];
  }
}

// ──────────────────────────────────────────────────────────────────────
// Excel → row 추출
// ──────────────────────────────────────────────────────────────────────
type ExcelRow = {
  rowIdx: number; // 1-based excel row (data starts at row 2)
  country: string;
  title_ko: string | null;
  title: string;
  application_no: string | null;
  application_date: string | null;
  publication_no: string | null;
  registration_no: string | null;
  applicants: string | null;
  inventors: string | null;
  status: string | null;
  major_category: string | null;
  middle_category: string | null;
  ipc_main: string | null;
  pdf_url: string | null;
  source_url: string | null;
  wipson_key: string;
};

function clean(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s || s === " ") return null;
  return s;
}

function excelDate(val: unknown): string | null {
  if (val == null || val === "") return null;
  // Excel may give a number (date serial) or a string "YYYY-MM-DD"
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return null;
    const yyyy = String(d.y).padStart(4, "0");
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  const s = String(val).trim();
  if (!s) return null;
  // Try YYYY.MM.DD, YYYY-MM-DD, YYYY/MM/DD
  const m = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  return null;
}

function readExcel(): ExcelRow[] {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets["유효데이터"];
  if (!ws) throw new Error("sheet '유효데이터' not found");
  const range = XLSX.utils.decode_range(ws["!ref"]!);
  const rows: ExcelRow[] = [];
  const cell = (col: string, r: number) => ws[col + r]?.v;
  const headerCol = new Map<string, string>();
  for (let c = range.s.c; c <= range.e.c; c++) {
    const col = XLSX.utils.encode_col(c);
    const label = clean(ws[col + "1"]?.v);
    if (label) headerCol.set(label, col);
  }
  const byHeader = (name: string, r: number) => {
    const col = headerCol.get(name);
    return col ? ws[col + r]?.v : undefined;
  };
  for (let r = 2; r <= range.e.r + 1; r++) {
    const cc = clean(cell("A", r));
    if (!cc) continue;
    const wipson = byHeader("WIPS ON key", r) ?? cell("AS", r);
    if (wipson == null || String(wipson).trim() === "") continue;
    rows.push({
      rowIdx: r,
      country: cc,
      title_ko: clean(cell("E", r)),
      title: clean(cell("F", r)) || clean(cell("E", r)) || "(untitled)",
      application_no: clean(cell("L", r)),
      application_date: excelDate(cell("M", r)),
      publication_no: clean(cell("N", r)),
      registration_no: clean(cell("P", r)),
      applicants: clean(cell("R", r)),
      inventors: clean(cell("S", r)),
      status: clean(cell("AC", r)),
      major_category: clean(byHeader("대분류", r)),
      middle_category: clean(byHeader("중분류", r)),
      ipc_main: clean(cell("AG", r)),
      pdf_url: clean(cell("AH", r)),
      source_url: clean(cell("AJ", r)),
      wipson_key: String(wipson).trim(),
    });
  }
  return rows;
}

// ──────────────────────────────────────────────────────────────────────
// 매칭 로직
// ──────────────────────────────────────────────────────────────────────
function matchPdf(
  row: ExcelRow,
  idx: { byKey: Map<string, PdfEntry[]>; all: PdfEntry[] },
): { matched: PdfEntry | null; candidates: PdfEntry[] } {
  const prefixes = countryPrefixes(row.country);
  // Build all candidate numbers from L, P, N
  const nums = new Set<string>();
  for (const v of [row.application_no, row.registration_no, row.publication_no]) {
    for (const n of numCandidates(v)) nums.add(n);
  }
  const candidates: PdfEntry[] = [];
  for (const pref of prefixes) {
    for (const n of nums) {
      const hits = idx.byKey.get(`${pref}:${n}`);
      if (hits) candidates.push(...hits);
    }
  }
  // dedupe
  const seen = new Set<string>();
  const uniq = candidates.filter((e) => {
    if (seen.has(e.filename)) return false;
    seen.add(e.filename);
    return true;
  });
  if (uniq.length === 0) return { matched: null, candidates: [] };
  if (uniq.length === 1) return { matched: uniq[0], candidates: uniq };
  // Multiple - prefer longest-num match (more specific)
  uniq.sort((a, b) => b.num.length - a.num.length);
  return { matched: uniq[0], candidates: uniq };
}

// ──────────────────────────────────────────────────────────────────────
// 메인
// ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("→ reading excel...");
  const rows = readExcel();
  console.log(`  ${rows.length} data rows`);

  console.log("→ indexing PDFs...");
  const idx = buildPdfIndex();
  console.log(`  ${idx.all.length} PDF files indexed`);

  // Match
  const matchedRows: Array<ExcelRow & { pdf_filename: string | null; description: string | null }> = [];
  const unmatched: Array<{ wipson_key: string; country: string; application_no: string | null; candidates: string }> = [];
  const usedFiles = new Set<string>();
  let withDesc = 0;

  // Build filename → entry lookup for overrides
  const byFilename = new Map<string, PdfEntry>();
  for (const e of idx.all) byFilename.set(e.filename, e);

  for (const row of rows) {
    let matched: PdfEntry | null = null;
    let candidates: PdfEntry[] = [];
    const override = MANUAL_OVERRIDES[row.wipson_key];
    if (override) {
      const m = byFilename.get(override);
      if (m) matched = m;
      else console.warn(`  ⚠ override file not found for ${row.wipson_key}: ${override}`);
    }
    if (!matched) {
      const r = matchPdf(row, idx);
      matched = r.matched;
      candidates = r.candidates;
    }
    let pdf_filename: string | null = null;
    let description: string | null = null;
    if (matched) {
      pdf_filename = matched.filename;
      usedFiles.add(matched.filename);
      const descPath = path.join(DESC_DIR, matched.stem + ".txt");
      if (fs.existsSync(descPath)) {
        description = fs.readFileSync(descPath, "utf-8");
        withDesc++;
      }
    } else {
      unmatched.push({
        wipson_key: row.wipson_key,
        country: row.country,
        application_no: row.application_no,
        candidates: candidates.map((c) => c.filename).join("|"),
      });
    }
    matchedRows.push({ ...row, pdf_filename, description });
  }

  // 통계
  const matched = matchedRows.filter((r) => r.pdf_filename).length;
  const byCountry: Record<string, { total: number; matched: number; withDesc: number }> = {};
  for (const r of matchedRows) {
    const c = r.country;
    if (!byCountry[c]) byCountry[c] = { total: 0, matched: 0, withDesc: 0 };
    byCountry[c].total++;
    if (r.pdf_filename) byCountry[c].matched++;
    if (r.description) byCountry[c].withDesc++;
  }
  console.log("\n=== Match stats ===");
  console.log(`  total rows         : ${matchedRows.length}`);
  console.log(`  matched to PDF     : ${matched}`);
  console.log(`  with description   : ${withDesc}`);
  console.log(`  unmatched          : ${unmatched.length}`);
  console.log(`  PDFs used          : ${usedFiles.size} / ${idx.all.length}`);
  console.log(`  PDFs not used      : ${idx.all.length - usedFiles.size}`);
  console.log("\n  per country:");
  for (const c of Object.keys(byCountry).sort()) {
    const s = byCountry[c];
    console.log(`    ${c}: total=${s.total} matched=${s.matched} withDesc=${s.withDesc}`);
  }

  // write unmatched.csv
  const csv =
    "wipson_key,country,application_no,candidates\n" +
    unmatched
      .map((u) =>
        [u.wipson_key, u.country, u.application_no ?? "", u.candidates]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
  fs.writeFileSync(UNMATCHED_CSV, csv + "\n", "utf-8");
  console.log(`\n  unmatched → ${UNMATCHED_CSV}`);

  // PDFs not used (in /datas/ but no excel row matched)
  const unused = idx.all.filter((e) => !usedFiles.has(e.filename)).map((e) => e.filename);
  if (unused.length) {
    console.log(`  unused PDFs (${unused.length}):`, unused.slice(0, 10).join(", "), unused.length > 10 ? "..." : "");
  }

  console.log("\n=== First 5 row samples ===");
  for (const r of matchedRows.slice(0, 5)) {
    console.log({
      wipson_key: r.wipson_key,
      country: r.country,
      title: r.title?.slice(0, 60),
      app_no: r.application_no,
      pdf: r.pdf_filename,
      desc_len: r.description?.length ?? 0,
    });
  }

  if (!hasDb) {
    console.log("\nDATABASE_URL 미설정 → dry-run, 적재 건너뜀");
    const preview = matchedRows.slice(0, 30).map((r) => ({
      wipson_key: r.wipson_key,
      pdf_filename: r.pdf_filename,
      country: r.country,
      title: r.title,
      title_ko: r.title_ko,
      application_no: r.application_no,
      application_date: r.application_date,
      publication_no: r.publication_no,
      registration_no: r.registration_no,
      applicants: r.applicants,
      inventors: r.inventors,
      ipc_main: r.ipc_main,
      status: r.status,
      description_len: r.description?.length ?? null,
      source_url: r.source_url,
      pdf_url: r.pdf_url,
    }));
    fs.writeFileSync(PREVIEW_JSON, JSON.stringify(preview, null, 2), "utf-8");
    console.log(`  preview (30건) → ${PREVIEW_JSON}`);
    return;
  }

  // upsert (Pool/WebSocket - HTTP sql driver는 ~1MB 본문에서 connection closed 발생)
  console.log("\n→ DATABASE_URL 설정됨, upsert 시작...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  let upserted = 0;
  try {
    for (const r of matchedRows) {
      const row: PatentRow & { pdf_filename: string | null } = {
        wipson_key: r.wipson_key,
        country: r.country,
        title: r.title,
        title_ko: r.title_ko,
        application_no: r.application_no,
        application_date: r.application_date,
        publication_no: r.publication_no,
        registration_no: r.registration_no,
        applicants: r.applicants,
        inventors: r.inventors,
        ipc_main: r.ipc_main,
        status: r.status,
        description: r.description,
        summary_md: null,
        source_url: r.source_url,
        pdf_url: r.pdf_url,
        pdf_filename: r.pdf_filename,
      };
      await client.query(
        `insert into patents (
          wipson_key, pdf_filename, country, title, title_ko,
          application_no, application_date, publication_no, registration_no,
          applicants, inventors, ipc_main, status, major_category, middle_category,
          description, summary_md, source_url, pdf_url, updated_at
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, now()
        )
        on conflict (wipson_key) do update set
          pdf_filename     = excluded.pdf_filename,
          country          = excluded.country,
          title            = excluded.title,
          title_ko         = excluded.title_ko,
          application_no   = excluded.application_no,
          application_date = excluded.application_date,
          publication_no   = excluded.publication_no,
          registration_no  = excluded.registration_no,
          applicants       = excluded.applicants,
          inventors        = excluded.inventors,
          ipc_main         = excluded.ipc_main,
          status           = excluded.status,
          major_category   = excluded.major_category,
          middle_category  = excluded.middle_category,
          description      = excluded.description,
          source_url       = excluded.source_url,
          pdf_url          = excluded.pdf_url,
          updated_at       = now()`,
        [
          row.wipson_key, row.pdf_filename, row.country, row.title, row.title_ko,
          row.application_no, row.application_date, row.publication_no, row.registration_no,
          row.applicants, row.inventors, row.ipc_main, row.status,
          row.major_category, row.middle_category,
          row.description, row.summary_md, row.source_url, row.pdf_url,
        ],
      );
      upserted++;
      if (upserted % 50 === 0) console.log(`  ...upserted ${upserted}/${matchedRows.length}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
  console.log(`\n✓ upsert 완료: ${upserted}건`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
