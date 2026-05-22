/**
 * data/summaries.json 의 요약(summary)을 DB(patents.summary_md)로 적재.
 *
 * 키 규약: "{country}_{doc_id}" 예) "CN_121871527"
 *   → patents.country = 'CN' AND patents.publication_no = '121871527' 매칭.
 *
 * 실행:
 *   cd web && NODE_PATH=./node_modules ./node_modules/.bin/tsx ../scripts/upload_summaries_json.ts
 *   cd web && NODE_PATH=./node_modules ./node_modules/.bin/tsx ../scripts/upload_summaries_json.ts --dry-run
 *   cd web && NODE_PATH=./node_modules ./node_modules/.bin/tsx ../scripts/upload_summaries_json.ts --limit 10
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { Pool } from "@neondatabase/serverless";

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
const SRC = path.join(ROOT, "data/summaries.json");

type SummaryRec = {
  id?: string;
  ctry?: string;
  doc_id?: string;
  title?: string;
  summary?: string;
  error?: string;
};

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
  if (!fs.existsSync(SRC)) {
    console.error(`source not found: ${SRC}`);
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  const host = (() => { try { return new URL(dbUrl).host; } catch { return "?"; } })();
  console.log(`target db: ${host}`);
  console.log(`source:    ${SRC}`);
  const pool = new Pool({ connectionString: dbUrl });

  const { rows } = await pool.query<{ wipson_key: string; country: string | null; publication_no: string | null }>(
    `select wipson_key, country, publication_no from patents`,
  );
  const idx = new Map<string, string>();
  const wipsonSet = new Set<string>();
  for (const r of rows) {
    wipsonSet.add(r.wipson_key);
    if (r.country && r.publication_no) {
      idx.set(`${r.country.trim().toUpperCase()}_${r.publication_no.trim()}`, r.wipson_key);
    }
  }

  function resolveWipsonKey(jsonKey: string, rec: SummaryRec): string | null {
    const direct = idx.get(jsonKey.toUpperCase());
    if (direct) return direct;
    if (!rec.doc_id) {
      const m = jsonKey.match(/^[A-Z]+_+(.+)$/i);
      if (m && wipsonSet.has(m[1])) return m[1];
    }
    return null;
  }

  const data = JSON.parse(fs.readFileSync(SRC, "utf-8")) as Record<string, SummaryRec>;
  const entries = Object.entries(data);

  const updates: { wipsonKey: string; key: string; text: string }[] = [];
  let missingDb = 0;
  let missingText = 0;
  let errored = 0;
  for (const [key, rec] of entries) {
    if (rec?.error) { errored++; continue; }
    const text = rec?.summary;
    if (!text || !text.trim()) { missingText++; continue; }
    const wkey = resolveWipsonKey(key, rec);
    if (!wkey) { missingDb++; continue; }
    updates.push({ wipsonKey: wkey, key, text });
  }

  const toApply = args.limit ? updates.slice(0, args.limit) : updates;

  console.log(`json entries:        ${entries.length}`);
  console.log(`mapped:              ${updates.length}`);
  console.log(`json w/o db row:     ${missingDb}`);
  console.log(`json w/o summary:    ${missingText}`);
  console.log(`json error entries:  ${errored}`);
  console.log(`will update:         ${toApply.length}${args.dryRun ? " (dry-run)" : ""}`);

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
      await pool.query(
        `update patents set summary_md = $1 where wipson_key = $2`,
        [u.text, u.wipsonKey],
      );
      ok++;
      if (i % 50 === 0 || i === toApply.length) {
        console.log(`  [${i}/${toApply.length}] ok=${ok} fail=${fail}`);
      }
    } catch (err) {
      fail++;
      console.warn(`  fail ${u.key} (${u.wipsonKey}): ${(err as Error).message}`);
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
