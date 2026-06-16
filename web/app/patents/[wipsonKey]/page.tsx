import { notFound } from "next/navigation";
import { getPatent, resolveSummary, getEasySummary } from "@/lib/patents";
import { PatentDetailContent } from "@/components/PatentDetailContent";

// Patent content is stable after ingestion; cache the heavy detail payload.
// Review comments and decisions are refreshed by the parent layout/list query.
export const revalidate = 86400;

export default async function Page({ params }: { params: Promise<{ wipsonKey: string }> }) {
  const { wipsonKey } = await params;
  const key = decodeURIComponent(wipsonKey);
  const patent = await getPatent(key);
  if (!patent) notFound();
  const summaryMd = resolveSummary(patent);
  const easySummaryMd = await getEasySummary(patent.wipsonKey);
  return <PatentDetailContent patent={patent} summaryMd={summaryMd} easySummaryMd={easySummaryMd} />;
}
