import { PatentList } from "@/components/PatentList";
import { listPatents } from "@/lib/patents";
import { CLASSIFIERS } from "@/lib/mock";

export const revalidate = false;

export default async function Page() {
  const patents = await listPatents();
  return <PatentList patents={patents} classifiers={CLASSIFIERS} />;
}
