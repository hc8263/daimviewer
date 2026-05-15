import { PatentList } from "@/components/PatentList";
import { listPatents } from "@/lib/patents";
import { CLASSIFIERS } from "@/lib/mock";

export const dynamic = "force-dynamic";

export default async function Page() {
  const patents = await listPatents();
  return <PatentList patents={patents} classifiers={CLASSIFIERS} />;
}
