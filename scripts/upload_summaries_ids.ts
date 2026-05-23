/** Upload summary_md for a specific list of summaries.json keys. */
import * as fs from "node:fs";
import * as path from "node:path";
import { Pool } from "@neondatabase/serverless";

function loadEnv(file: string) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv(path.resolve(__dirname, "../web/.env.local"));

const SRC = path.resolve(__dirname, "../data/summaries.json");
const IDS = process.argv.slice(2);
if (!IDS.length) { console.error("usage: upload_summaries_ids.ts <id1> <id2> ..."); process.exit(1); }

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query<{ wipson_key: string; country: string | null; publication_no: string | null }>(
    `select wipson_key, country, publication_no from patents`,
  );
  const idx = new Map<string, string>();
  const wipsonSet = new Set<string>();
  for (const r of rows) {
    wipsonSet.add(r.wipson_key);
    if (r.country && r.publication_no) idx.set(`${r.country.trim().toUpperCase()}_${r.publication_no.trim()}`, r.wipson_key);
  }

  const data = JSON.parse(fs.readFileSync(SRC, "utf-8")) as Record<string, { summary?: string; doc_id?: string }>;
  let ok = 0, fail = 0;
  for (const key of IDS) {
    const rec = data[key];
    if (!rec?.summary?.trim()) { console.warn(`SKIP ${key}: no summary`); fail++; continue; }
    let wkey = idx.get(key.toUpperCase());
    if (!wkey) {
      const m = key.match(/^[A-Z]+_+(.+)$/i);
      if (m && wipsonSet.has(m[1])) wkey = m[1];
    }
    if (!wkey) { console.warn(`SKIP ${key}: no DB row`); fail++; continue; }
    try {
      await pool.query(`update patents set summary_md = $1 where wipson_key = $2`, [rec.summary, wkey]);
      console.log(`✓ ${key} -> ${wkey} (chars=${rec.summary.length})`);
      ok++;
    } catch (e) {
      console.error(`✗ ${key}: ${(e as Error).message}`); fail++;
    }
  }
  console.log(`\nupdated=${ok} failed=${fail}`);
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
