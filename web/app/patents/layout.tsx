import { listPatents } from "@/lib/patents";
import { PatentsShell } from "@/components/PatentsShell";

// Cache the patent list aggressively — it only changes when reviews update,
// and decision changes are handled optimistically client-side.
export const revalidate = 300;

export default async function PatentsLayout({ children }: { children: React.ReactNode }) {
  const patents = await listPatents();
  return <PatentsShell patents={patents}>{children}</PatentsShell>;
}
