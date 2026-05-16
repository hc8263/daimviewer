/**
 * patents.description → description_ko 번역 채우기 (resumable).
 *
 * 실행:
 *   cd web && ./node_modules/.bin/tsx ../scripts/translate_descriptions.ts
 *   cd web && ./node_modules/.bin/tsx ../scripts/translate_descriptions.ts --limit 3 --country JP
 *
 * - description_ko 가 null 인 행만 처리 → 재실행 시 이어서 진행.
 * - 행 단위로 UPDATE 후 즉시 commit (Pool 자동 commit 모드).
 * - 동시성 3, 행 단위 최대 3회 재시도(지수 백오프).
 * - AI Gateway 경유 anthropic/claude-haiku-4-5 (ai SDK generateText).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { Pool } from "@neondatabase/serverless";
import { generateText } from "ai";

// ──────────────────────────────────────────────────────────────────────
// env 로드 (web/.env.local)
// ──────────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────────────────────────────
function parseArgs(argv: string[]) {
  const out: { limit?: number; country?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a === "--country") out.country = String(argv[++i]).toUpperCase();
  }
  return out;
}
const ARGS = parseArgs(process.argv.slice(2));

// ──────────────────────────────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────────────────────────────
const MAX_CHUNK_CHARS = 80_000;
const CONCURRENCY = 3;
const MAX_RETRIES = 3;
const BACKOFFS_MS = [2_000, 8_000, 30_000];
const MODEL = "anthropic/claude-haiku-4-5";

const SYSTEM_PROMPT = `당신은 특허 명세서 전문 번역가입니다. 입력된 특허 '상세한 설명' 본문을 한국어로 정확하고 자연스럽게 번역하세요.

규칙:
- 기술 용어는 보존하되 한국 특허업계 표준 용어로 번역하세요. 원어 병기는 모호한 경우에만 괄호로 (예: 트랜시버(transceiver)).
- 단락 구분(\\n\\n)을 그대로 유지하세요.
- 도면 부호, 화학식, 수식, 숫자, 단위, IPC 코드 등은 변경하지 마세요.
- 원문이 이미 한국어이거나 일부 한국어가 섞여 있어도 그 부분은 그대로 두고 비한국어 부분만 번역하세요.
- 출력은 번역된 본문만. "다음은 번역입니다" 같은 서론·주석·메타 코멘트는 절대 쓰지 마세요. 코드블록(\`\`\`)으로 감싸지 마세요.`;

// ──────────────────────────────────────────────────────────────────────
// 청크 분할 (단락 경계 기준)
// ──────────────────────────────────────────────────────────────────────
function chunkByParagraphs(text: string, maxLen = MAX_CHUNK_CHARS): string[] {
  if (text.length <= maxLen) return [text];
  const paras = text.split(/\n\n+/);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paras) {
    // 단일 단락이 한계 초과 → 길이 기준 강제 분할
    if (p.length > maxLen) {
      if (buf) {
        chunks.push(buf);
        buf = "";
      }
      for (let i = 0; i < p.length; i += maxLen) {
        chunks.push(p.slice(i, i + maxLen));
      }
      continue;
    }
    const candidate = buf ? buf + "\n\n" + p : p;
    if (candidate.length > maxLen) {
      if (buf) chunks.push(buf);
      buf = p;
    } else {
      buf = candidate;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

// ──────────────────────────────────────────────────────────────────────
// 1회 번역 (재시도 포함)
// ──────────────────────────────────────────────────────────────────────
async function translateOnce(
  text: string,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await generateText({
        model: MODEL,
        system: SYSTEM_PROMPT,
        prompt: text,
      });
      const usage = (res as any).usage ?? {};
      const inputTokens = Number(usage.inputTokens ?? usage.promptTokens ?? 0) || 0;
      const outputTokens = Number(usage.outputTokens ?? usage.completionTokens ?? 0) || 0;
      return { text: res.text, inputTokens, outputTokens };
    } catch (err) {
      lastErr = err;
      if (attempt >= MAX_RETRIES) break;
      const wait = BACKOFFS_MS[attempt] ?? 30_000;
      console.warn(`  ⚠ translate attempt ${attempt + 1} failed: ${(err as Error).message?.slice(0, 200)} → wait ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

async function translateDescription(
  text: string,
): Promise<{ text: string; chunks: number; inputTokens: number; outputTokens: number }> {
  const chunks = chunkByParagraphs(text);
  const parts: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  for (const c of chunks) {
    const r = await translateOnce(c);
    parts.push(r.text);
    inputTokens += r.inputTokens;
    outputTokens += r.outputTokens;
  }
  return { text: parts.join("\n\n"), chunks: chunks.length, inputTokens, outputTokens };
}

// ──────────────────────────────────────────────────────────────────────
// 메인
// ──────────────────────────────────────────────────────────────────────
type Row = { wipson_key: string; country: string; description: string };

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL 미설정 (web/.env.local 확인).");
    process.exit(1);
  }
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error("AI_GATEWAY_API_KEY 미설정 (web/.env.local 또는 shell).");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // 대상 행 조회
  const where: string[] = ["description is not null", "description_ko is null"];
  const params: unknown[] = [];
  if (ARGS.country) {
    params.push(ARGS.country);
    where.push(`country = $${params.length}`);
  }
  let limitClause = "";
  if (ARGS.limit && Number.isFinite(ARGS.limit)) {
    params.push(ARGS.limit);
    limitClause = `limit $${params.length}`;
  }
  const sqlText = `
    select wipson_key, country, description
    from patents
    where ${where.join(" and ")}
    order by country, wipson_key
    ${limitClause}
  `;

  const client = await pool.connect();
  let rows: Row[] = [];
  try {
    const res = await client.query<Row>(sqlText, params);
    rows = res.rows;
  } finally {
    client.release();
  }

  const total = rows.length;
  console.log(`→ ${total} rows pending (country=${ARGS.country ?? "ALL"}, limit=${ARGS.limit ?? "none"})`);
  if (total === 0) {
    await pool.end();
    return;
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // 간단한 워커풀
  let cursor = 0;
  const t0 = Date.now();

  async function worker(workerId: number) {
    while (true) {
      const idx = cursor++;
      if (idx >= rows.length) return;
      const row = rows[idx];
      const i = idx + 1;
      const len = row.description.length;
      try {
        const r = await translateDescription(row.description);
        // UPDATE — Pool 은 autocommit, 즉시 영구화 → resumable
        const updClient = await pool.connect();
        try {
          await updClient.query(
            `update patents set description_ko = $1, updated_at = now() where wipson_key = $2`,
            [r.text, row.wipson_key],
          );
        } finally {
          updClient.release();
        }
        totalInputTokens += r.inputTokens;
        totalOutputTokens += r.outputTokens;
        succeeded++;
        console.log(
          `[${i}/${total}] wipsonKey=${row.wipson_key} country=${row.country} len=${len} chunks=${r.chunks} ok (w${workerId} +${r.inputTokens}/${r.outputTokens} tok)`,
        );
      } catch (err) {
        failed++;
        console.error(
          `[${i}/${total}] wipsonKey=${row.wipson_key} country=${row.country} len=${len} FAILED: ${(err as Error).message?.slice(0, 300)}`,
        );
      } finally {
        processed++;
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, rows.length) }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("\n=== Summary ===");
  console.log(`  processed : ${processed}`);
  console.log(`  succeeded : ${succeeded}`);
  console.log(`  failed    : ${failed}`);
  console.log(`  tokens    : in=${totalInputTokens.toLocaleString()} out=${totalOutputTokens.toLocaleString()} total=${(totalInputTokens + totalOutputTokens).toLocaleString()}`);
  console.log(`  elapsed   : ${elapsed}s`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
