/**
 * Backfill patents.claim_text from the final quantitative-analysis workbook.
 *
 * Rules:
 *   - B in CN/EP/US: use I (representative claim translation)
 *   - B in JP/KR:    use J (representative claim)
 *   - B in DE:       translate J to Korean, then store it
 *
 * Run:
 *   cd web && ./node_modules/.bin/tsx ../scripts/backfill_claims_from_xlsx.ts
 *   cd web && ./node_modules/.bin/tsx ../scripts/backfill_claims_from_xlsx.ts --non-de
 *   cd web && ./node_modules/.bin/tsx ../scripts/backfill_claims_from_xlsx.ts --de-only
 *   DATABASE_URL="$PROD_DATABASE_URL" ./node_modules/.bin/tsx ../scripts/backfill_claims_from_xlsx.ts --preserve-existing
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { createRequire } from "node:module";
import { geminiGenerate } from "../web/lib/gemini";
import { normalizeClaimText } from "../web/lib/claimText";

const ROOT = "/Users/vincentlim/coding/dmpat_patent_anal";
const XLSX_PATH = path.join(ROOT, "4_정량분석용파일_최종.xlsx");
const ENV_PATH = path.join(ROOT, "web/.env.local");
const requireFromWeb = createRequire(path.join(ROOT, "web/package.json"));
const XLSX = requireFromWeb("xlsx") as typeof import("xlsx");
const { Pool } = requireFromWeb("@neondatabase/serverless") as typeof import("@neondatabase/serverless");

const CLAIM_TRANSLATE_SYSTEM_PROMPT = `[Role]
당신은 특허 청구항 전문 번역가입니다.

[Rules]
1. 입력된 대표 청구항만 자연스럽고 정확한 한국어로 번역하세요.
2. 번역 외의 설명, 요약, 주석은 절대 추가하지 마세요.
3. 청구항의 구성요소 구분 기호(: , ;)와 도면부호, 번호, 약어는 최대한 보존하세요.
`;

type ClaimRow = {
  rowNumber: number;
  wipsonKey: string;
  claimCountry: string;
  translatedClaim: string | null;
  rawClaim: string | null;
};

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

function clean(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function selectClaim(row: ClaimRow): string | null {
  const country = row.claimCountry.toUpperCase();
  if (country === "CN" || country === "EP" || country === "US") {
    return row.translatedClaim || row.rawClaim;
  }
  if (country === "JP" || country === "KR") {
    return row.rawClaim || row.translatedClaim;
  }
  if (country === "DE") {
    return row.rawClaim || row.translatedClaim;
  }
  return row.translatedClaim || row.rawClaim;
}

function readClaimRows(): ClaimRow[] {
  const workbook = XLSX.readFile(XLSX_PATH);
  const sheet = workbook.Sheets["다운로드"];
  if (!sheet) throw new Error("sheet '다운로드' not found");
  const range = XLSX.utils.decode_range(sheet["!ref"] || "");
  const rows: ClaimRow[] = [];
  for (let r = 2; r <= range.e.r + 1; r++) {
    const wipsonKey = clean(sheet[`AP${r}`]?.v);
    const claimCountry = clean(sheet[`B${r}`]?.v);
    if (!wipsonKey || !claimCountry) continue;
    rows.push({
      rowNumber: r,
      wipsonKey,
      claimCountry,
      translatedClaim: clean(sheet[`I${r}`]?.v),
      rawClaim: clean(sheet[`J${r}`]?.v),
    });
  }
  return rows;
}

async function translateGermanClaim(rawClaim: string, cache: Map<string, string>) {
  const cached = cache.get(rawClaim);
  if (cached) return cached;
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required to translate DE claims");
  }
  const translated = (await geminiGenerate({
    system: CLAIM_TRANSLATE_SYSTEM_PROMPT,
    user: rawClaim,
    temperature: 0.1,
    maxOutputTokens: 4096,
    timeoutMs: 45_000,
    thinkingBudget: 0,
  })).trim();
  if (!translated) throw new Error("empty translation");
  cache.set(rawClaim, translated);
  return translated;
}

async function main() {
  loadEnvFile(ENV_PATH);
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const mode = process.argv.includes("--de-only")
    ? "de-only"
    : process.argv.includes("--non-de")
      ? "non-de"
      : "all";
  const preserveExisting = process.argv.includes("--preserve-existing");
  const allRows = readClaimRows();
  const rows = allRows.filter((row) => {
    const isDe = row.claimCountry.toUpperCase() === "DE";
    if (mode === "de-only") return isDe;
    if (mode === "non-de") return !isDe;
    return true;
  });
  console.log(`claims read from xlsx: ${allRows.length}; mode=${mode}; target=${rows.length}; preserveExisting=${preserveExisting}`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const deTranslationCache = new Map<string, string>();
  let updated = 0;
  let missingClaim = 0;
  let missingPatent = 0;

  try {
    await client.query("alter table patents add column if not exists claim_text text");

    for (const row of rows) {
      let claimText = selectClaim(row);
      if (!claimText) {
        missingClaim++;
        console.warn(`row ${row.rowNumber}: empty claim (${row.wipsonKey})`);
        continue;
      }
      if (row.claimCountry.toUpperCase() === "DE") {
        claimText = await translateGermanClaim(claimText, deTranslationCache);
      }
      claimText = normalizeClaimText(claimText);

      const result = await client.query(
        `update patents
            set claim_text = $2,
                updated_at = now()
          where wipson_key = $1
            and ($3::boolean = false or claim_text is null)`,
        [row.wipsonKey, claimText, preserveExisting],
      );
      if (result.rowCount === 0) {
        missingPatent++;
        console.warn(`row ${row.rowNumber}: patent not found (${row.wipsonKey})`);
      } else {
        updated += result.rowCount || 0;
      }
      if (updated > 0 && updated % 50 === 0) {
        console.log(`updated ${updated}/${rows.length}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`done: updated=${updated}, missingClaim=${missingClaim}, missingPatent=${missingPatent}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
