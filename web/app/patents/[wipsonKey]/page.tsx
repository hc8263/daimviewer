import { notFound } from "next/navigation";
import { getPatent, resolveSummary, getEasySummary } from "@/lib/patents";
import { PatentDetailContent } from "@/components/PatentDetailContent";

// Cache per-patent fetch — heavy fields (description, summary_md) are static
// once ingested; reviews are tracked separately and merged client-side.
export const revalidate = 300;

export default async function Page({ params }: { params: Promise<{ wipsonKey: string }> }) {
  const { wipsonKey } = await params;
  const key = decodeURIComponent(wipsonKey);
  const patent = await getPatent(key);
  if (!patent) notFound();
  const summaryMd = resolveSummary(patent);
  const easySummaryMd = await getEasySummary(patent.wipsonKey);
  return <PatentDetailContent patent={patent} summaryMd={summaryMd} easySummaryMd={easySummaryMd} />;
}
