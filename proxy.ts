import { NextResponse, type NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

// /admin exposes every reviewer's real name and rawest answers, so it is gated by HTTP Basic auth.
// This file is a Next 16 proxy (the renamed middleware) — it always runs on the Node.js runtime, so
// node:crypto.timingSafeEqual is available. Do NOT add `export const runtime`/`dynamic` here.
export const config = {
  // Both entries: "/admin/:path*" alone does not match the bare "/admin" index.
  matcher: ["/admin", "/admin/:path*"],
};

const USERNAME = "admin";
const REALM = "Soothly Admin";

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
  });
}

// SHA-256 both sides to fixed 32-byte digests so timingSafeEqual never throws on a length mismatch
// (which would itself leak length) and the comparison stays constant-time.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export default function proxy(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  // Fail CLOSED: with no password configured (unset or empty default), never allow.
  if (!expected) return unauthorized();

  // RFC 7617 auth schemes are case-insensitive ("Basic" / "basic").
  const match = /^Basic\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  if (!match) return unauthorized();

  // Buffer.from(.., "base64") never throws — it returns garbage on bad input, which simply fails the
  // compare. The real guard is the missing-colon case below.
  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const i = decoded.indexOf(":");
  if (i === -1) return unauthorized();

  const user = decoded.slice(0, i);
  const pass = decoded.slice(i + 1); // split on the first colon — passwords may contain colons

  // Evaluate both compares before combining so the result never short-circuits on the username.
  const okUser = safeEqual(user, USERNAME);
  const okPass = safeEqual(pass, expected);
  if (!(okUser && okPass)) return unauthorized();

  return NextResponse.next();
}
