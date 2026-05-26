// Unified data-access layer. Reads from Neon when DATABASE_URL is set,
// otherwise falls back to the design-mock data so the UI is always renderable.
import { sql, hasDb, type PatentRow } from "./db";
import { MOCK_PATENTS, MOCK_SUMMARIES, getMockSummary } from "./mock";

export type PatentView = {
  index?: number;
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
  comment: string | null;
  excluded: boolean;
  adminNote: string | null;
  sourceUrl: string;
  pdfUrl: string | null;
  summaryMd: string | null;
  description: string | null;
  descriptionKo: string | null;
  pdfFilename?: string | null;
  // raw fields preserved for CSV export
  applicationNo?: string | null;
  publicationNo?: string | null;
  registrationNo?: string | null;
};

function toDateStr(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

type RowExt = PatentRow & {
  decision?: string | null;
  reviewer?: string | null;
  review_date?: string | null;
  note?: string | null;
  excluded?: boolean | null;
};

function rowToView(r: RowExt): PatentView {
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
    reviewStatus: r.decision || null,
    reviewer: r.reviewer || null,
    reviewDate: r.review_date || null,
    comment: r.note ?? null,
    excluded: !!r.excluded,
    adminNote: r.admin_note ?? null,
    sourceUrl: r.source_url || "#",
    pdfUrl: r.pdf_url,
    summaryMd: r.summary_md,
    description: r.description,
    descriptionKo: r.description_ko ?? null,
    pdfFilename: (r as any).pdf_filename ?? null,
    applicationNo: r.application_no,
    publicationNo: r.publication_no,
    registrationNo: r.registration_no,
  };
}

function assignIndices(list: PatentView[]): PatentView[] {
  return list.map((p, i) => ({ ...p, index: i + 1 }));
}

export async function listPatents(opts?: { includeExcluded?: boolean }): Promise<PatentView[]> {
  if (!hasDb || !sql) return assignIndices(MOCK_PATENTS);
  try {
    // List view never reads description/summary_md/description_ko — skip those
    // big columns (14MB+ total across ~730 rows) so the page payload stays small.
    const rows = (await sql`
      select p.wipson_key, p.country, p.title, p.title_ko,
             p.application_no, p.application_date, p.publication_no,
             p.registration_no, p.applicants, p.inventors,
             p.ipc_main, p.status, p.source_url, p.pdf_url, p.pdf_filename,
             null::text as description, null::text as description_ko,
             null::text as summary_md, p.admin_note,
             r.decision, r.reviewer,
             to_char(r.updated_at, 'YYYY-MM-DD') as review_date,
             r.note, coalesce(r.excluded, false) as excluded
        from patents p
        left join lateral (
          select decision, reviewer, updated_at, note, excluded
            from reviews
           where reviews.wipson_key = p.wipson_key
           order by updated_at desc
           limit 1
        ) r on true
        order by p.application_date desc nulls last
    `) as unknown as RowExt[];
    // Always return all rows including excluded; UI filters by default.
    return assignIndices(rows.map(rowToView));
  } catch (err) {
    console.warn("[patents] DB query failed, falling back to mock:", err);
    return assignIndices(MOCK_PATENTS);
  }
}

export async function getPatent(wipsonKey: string): Promise<PatentView | null> {
  if (!hasDb || !sql) {
    return MOCK_PATENTS.find(p => p.wipsonKey === wipsonKey) || null;
  }
  try {
    const rows = (await sql`
      select p.*, r.decision, r.reviewer,
             to_char(r.updated_at, 'YYYY-MM-DD') as review_date,
             r.note, coalesce(r.excluded, false) as excluded
        from patents p
        left join lateral (
          select decision, reviewer, updated_at, note, excluded
            from reviews
           where reviews.wipson_key = p.wipson_key
           order by updated_at desc
           limit 1
        ) r on true
        where p.wipson_key = ${wipsonKey}
        limit 1
    `) as unknown as RowExt[];
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
