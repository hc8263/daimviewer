import { listPatents } from "@/lib/patents";
import { PatentsShell } from "@/components/PatentsShell";

// Keep review/comment metadata fresh. Heavy per-patent content is cached by the
// detail page itself.
export const dynamic = "force-dynamic";

export default async function PatentsLayout({ children }: { children: React.ReactNode }) {
  const patents = await listPatents();
  return <PatentsShell patents={patents}>{children}</PatentsShell>;
}
