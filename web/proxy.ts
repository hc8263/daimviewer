import { NextRequest, NextResponse } from "next/server";

const REALM = "Patent Review";
const DEFAULT_PASSWORDS = new Set(["1"]);

export function proxy(req: NextRequest) {
  // No password set → wide open (useful during local dev)
  const expected = process.env.SITE_PASSWORD;
  if (!expected && DEFAULT_PASSWORDS.size === 0) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const idx = decoded.indexOf(":");
      const pw = idx >= 0 ? decoded.slice(idx + 1) : decoded;
      if ((expected && pw === expected) || DEFAULT_PASSWORDS.has(pw)) return NextResponse.next();
    } catch {
      // fallthrough to 401
    }
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts).*)"],
};
