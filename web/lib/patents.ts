// Unified data-access layer. Reads from Neon when DATABASE_URL is set,
// otherwise falls back to the design-mock data so the UI is always renderable.
import { sql, hasDb, type PatentRow } from "./db";
import { MOCK_PATENTS, MOCK_SUMMARIES, getMockSummary } from "./mock";

export type PatentView = {
  wipsonKey: string;
  fileTitle: string;
  titleKo: string | null;
  country: string;
  applicant: string;
  inventor: string;
  appDate: string;
  pubDate: string;
  ipc: string;
  classifier: string;
  reviewStatus: string | null;
  reviewer: string | null;
  reviewDate: string | null;
  sourceUrl: string;
  pdfUrl: string | null;
  summaryMd: string | null;
  description: string | null;
  descriptionKo: string | null;
};

function toDateStr(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function rowToView(r: PatentRow & { decision?: string | null; reviewer?: string | null; review_date?: string | null }): PatentView {
  return {
    wipsonKey: r.wipson_key,
    fileTitle: r.title_ko || r.title,
    titleKo: r.title_ko,
    country: r.country || "KR",
    applicant: r.applicants || "",
    inventor: r.inventors || "",
    appDate: toDateStr(r.application_date),
    pubDate: r.publication_no || "",
    ipc: r.ipc_main || "",
    classifier: r.status || "",
    reviewStatus: (r as any).decision || null,
    reviewer: (r as any).reviewer || null,
    reviewDate: (r as any).review_date || null,
    sourceUrl: r.source_url || "#",
    pdfUrl: r.pdf_url,
    summaryMd: r.summary_md,
    description: r.description,
    descriptionKo: (r as any).description_ko ?? null,
  };
}

export async function listPatents(): Promise<PatentView[]> {
  if (!hasDb || !sql) return MOCK_PATENTS;
  try {
    // List view never reads description/summary_md/description_ko — skip those
    // big columns (14MB+ total across ~730 rows) so the page payload stays small.
    const rows = (await sql`
      select p.wipson_key, p.country, p.title, p.title_ko,
             p.application_no, p.application_date, p.publication_no,
             p.registration_no, p.applicants, p.inventors,
             p.ipc_main, p.status, p.source_url, p.pdf_url,
             null::text as description, null::text as description_ko,
             null::text as summary_md,
             null::text as decision, null::text as reviewer, null::text as review_date
        from patents p
        order by p.application_date desc nulls last
    `) as unknown as (PatentRow & { decision: string | null; reviewer: string | null; review_date: string | null })[];
    return rows.map(rowToView);
  } catch (err) {
    console.warn("[patents] DB query failed, falling back to mock:", err);
    return MOCK_PATENTS;
  }
}

export async function getPatent(wipsonKey: string): Promise<PatentView | null> {
  if (!hasDb || !sql) {
    return MOCK_PATENTS.find(p => p.wipsonKey === wipsonKey) || null;
  }
  try {
    const rows = (await sql`
      select * from patents where wipson_key = ${wipsonKey} limit 1
    `) as unknown as PatentRow[];
    if (!rows.length) return null;
    const v = rowToView(rows[0]);
    if (!v.summaryMd) v.summaryMd = null;
    return v;
  } catch (err) {
    console.warn("[patents] DB query failed:", err);
    return MOCK_PATENTS.find(p => p.wipsonKey === wipsonKey) || null;
  }
}

export function resolveSummary(p: PatentView): string {
  return p.summaryMd || getMockSummary(p);
}

export { MOCK_PATENTS, MOCK_SUMMARIES };
