import { notFound } from "next/navigation";
import { getPatent, resolveSummary } from "@/lib/patents";
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
  return <PatentDetailContent patent={patent} summaryMd={summaryMd} />;
}
