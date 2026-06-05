import { NextResponse } from "next/server";
import { listPatents } from "@/lib/patents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const patents = await listPatents();
  return NextResponse.json({ patents });
}
