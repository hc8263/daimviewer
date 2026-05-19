/**
 * data/descriptions_ko/*.txt 의 한글 번역을 DB(patents.description_ko)로 적재.
 *
 * 실행:
 *   cd web && NODE_PATH=./node_modules ./node_modules/.bin/tsx ../scripts/upload_translations.ts
 *   cd web && NODE_PATH=./node_modules ./node_modules/.bin/tsx ../scripts/upload_translations.ts --dry-run
 *
 * - DB의 pdf_filename 컬럼으로 파일명 매핑 (별도 인덱싱 불필요).
 * - 이미 description_ko 가 채워진 행도 새 번역으로 덮어씀 (재실행 가능).
 * - --dry-run: 매핑 갯수만 출력, UPDATE 안 함.
 * - --limit N: N건만 처리.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { Pool } from "@neondatabase/serverless";

// env 로드
function loadEnv(file: string) {
  if (!fs.existsSync(file)) return;
  const txt = fs.readFileSync(file, "utf-8");
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv(path.resolve(__dirname, "../web/.env.local"));

const ROOT = path.resolve(__dirname, "..");
const KO_DIR = path.join(ROOT, "data/descriptions_ko");

function parseArgs(argv: string[]) {
  const out: { dryRun: boolean; limit?: number } = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--limit") out.limit = Number(argv[++i]);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set (load web/.env.local).");
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  const host = (() => {
    try { return new URL(dbUrl).host; } catch { return "?"; }
  })();
  console.log(`target db: ${host}`);
  const pool = new Pool({ connectionString: dbUrl });

  // pdf_filename → wipson_key 매핑 (DB가 진실)
  const { rows } = await pool.query<{ wipson_key: string; pdf_filename: string }>(
    `select wipson_key, pdf_filename from patents where pdf_filename is not null`
  );

  const updates: { wipsonKey: string; koPath: string; bytes: number }[] = [];
  let missingDb = 0;
  let missingFile = 0;

  for (const r of rows) {
    const stem = r.pdf_filename.replace(/\.pdf$/i, "");
    const koPath = path.join(KO_DIR, `${stem}.txt`);
    if (!fs.existsSync(koPath)) {
      missingFile++;
      continue;
    }
    const stat = fs.statSync(koPath);
    if (stat.size === 0) {
      missingFile++;
      continue;
    }
    updates.push({ wipsonKey: r.wipson_key, koPath, bytes: stat.size });
  }

  // ko 파일은 있는데 DB pdf_filename 매핑이 없는 경우
  const dbStems = new Set(rows.map((r) => r.pdf_filename.replace(/\.pdf$/i, "")));
  if (fs.existsSync(KO_DIR)) {
    for (const fn of fs.readdirSync(KO_DIR)) {
      if (!fn.endsWith(".txt")) continue;
      const stem = fn.replace(/\.txt$/i, "");
      if (!dbStems.has(stem)) missingDb++;
    }
  }

  const toApply = args.limit ? updates.slice(0, args.limit) : updates;

  console.log(`mapped:        ${updates.length}`);
  console.log(`db rows w/o ko file: ${missingFile}`);
  console.log(`ko files w/o db row: ${missingDb}`);
  console.log(`will update:   ${toApply.length}${args.dryRun ? " (dry-run)" : ""}`);

  if (args.dryRun) {
    await pool.end();
    return;
  }

  let ok = 0;
  let fail = 0;
  let i = 0;
  for (const u of toApply) {
    i++;
    try {
      const ko = fs.readFileSync(u.koPath, "utf-8");
      await pool.query(`update patents set description_ko = $1 where wipson_key = $2`, [
        ko,
        u.wipsonKey,
      ]);
      ok++;
      if (i % 25 === 0 || i === toApply.length) {
        console.log(`  [${i}/${toApply.length}] ok=${ok} fail=${fail}`);
      }
    } catch (err) {
      fail++;
      console.warn(`  fail ${u.wipsonKey}: ${(err as Error).message}`);
    }
  }

  console.log(`\n=== summary ===`);
  console.log(`  updated: ${ok}`);
  console.log(`  failed:  ${fail}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
