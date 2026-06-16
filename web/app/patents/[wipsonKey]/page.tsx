import { notFound } from "next/navigation";
import { getPatent, resolveSummary, getEasySummary } from "@/lib/patents";
import { PatentDetailContent } from "@/components/PatentDetailContent";

// Detail pages include review state and claim text that may be backfilled after
// deployment, so fetch them on each request instead of serving stale ISR output.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ wipsonKey: string }> }) {
  const { wipsonKey } = await params;
  const key = decodeURIComponent(wipsonKey);
  const patent = await getPatent(key);
  if (!patent) notFound();
  const summaryMd = resolveSummary(patent);
  const easySummaryMd = await getEasySummary(patent.wipsonKey);
  return <PatentDetailContent patent={patent} summaryMd={summaryMd} easySummaryMd={easySummaryMd} />;
}
