import { isAdmin } from "@/lib/admin";
import { AdminLogin } from "@/components/AdminLogin";
import { AdminPanel } from "@/components/AdminPanel";
import { listPatents } from "@/lib/patents";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAdmin();
  if (!authed) {
    return <AdminLogin />;
  }
  const patents = await listPatents();
  return <AdminPanel patents={patents} />;
}
