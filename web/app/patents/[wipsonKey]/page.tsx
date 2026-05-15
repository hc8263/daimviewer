import { notFound } from "next/navigation";
import { DetailPage } from "@/components/DetailPage";
import { getPatent, listPatents, resolveSummary } from "@/lib/patents";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ wipsonKey: string }> }) {
  const { wipsonKey } = await params;
  const key = decodeURIComponent(wipsonKey);
  const [patent, patents] = await Promise.all([getPatent(key), listPatents()]);
  if (!patent) notFound();
  const summaryMd = resolveSummary(patent);
  return <DetailPage patent={patent} patents={patents} summaryMd={summaryMd} />;
}
