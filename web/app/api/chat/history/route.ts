import { NextRequest } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

type Row = { role: "user" | "assistant"; content: string; created_at: string };

export async function GET(req: NextRequest) {
  const wipsonKey = req.nextUrl.searchParams.get("wipsonKey");
  if (!wipsonKey) return new Response("wipsonKey required", { status: 400 });
  if (!sql) return Response.json({ messages: [] });

  try {
    const rows = (await sql`
      select role, content, created_at
        from chat_messages
        where wipson_key = ${wipsonKey}
        order by id asc
    `) as unknown as Row[];
    return Response.json({
      messages: rows.map((r) => ({ role: r.role, text: r.content })),
    });
  } catch (err) {
    console.warn("[chat/history] query failed:", err);
    return Response.json({ messages: [] });
  }
}

export async function DELETE(req: NextRequest) {
  const wipsonKey = req.nextUrl.searchParams.get("wipsonKey");
  if (!wipsonKey) return new Response("wipsonKey required", { status: 400 });
  if (!sql) return Response.json({ ok: true });

  try {
    await sql`delete from chat_messages where wipson_key = ${wipsonKey}`;
    return Response.json({ ok: true });
  } catch (err) {
    console.warn("[chat/history] delete failed:", err);
    return new Response("delete failed", { status: 500 });
  }
}
