import { neon } from "@neondatabase/serverless";

// `sql` will throw at call-time if DATABASE_URL is unset, but importing this
// file never throws — so routes can fall back to mock data when Neon is not yet
// provisioned.
export const hasDb = !!process.env.DATABASE_URL;
export const sql = hasDb ? neon(process.env.DATABASE_URL!) : null;

export type PatentRow = {
  wipson_key: string;
  country: string | null;
  title: string;
  title_ko: string | null;
  application_no: string | null;
  application_date: string | null;
  publication_no: string | null;
  registration_no: string | null;
  applicants: string | null;
  inventors: string | null;
  ipc_main: string | null;
  status: string | null;
  description: string | null;
  summary_md: string | null;
  source_url: string | null;
  pdf_url: string | null;
};
