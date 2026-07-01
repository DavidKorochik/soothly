import { NextResponse } from "next/server";
import { z } from "zod";
import { getSynthesisStatus } from "@/lib/db/queries";
import { mapSynthesisStatus } from "@/lib/synthesis/statusResponse";
import { SUPPORT_MESSAGE } from "@/lib/safety/decide";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Poll endpoint for the async book job (the existing /api/status is unrelated vendor health). Read-only:
// it never writes. The status->response mapping (stale 'synthesizing' -> 'error', allowlisted shape)
// lives in the pure, tested mapSynthesisStatus; the static flagged message is attached here.
// TODO(accounts): like /api/book/[key], a session UUID is an unguessable capability with no auth yet -
// resolving it to a bookKey/title is unauthenticated until accounts land.
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId || !z.string().uuid().safeParse(sessionId).success) {
    return jsonNoStore({ status: "error" }, 400);
  }
  const mapped = mapSynthesisStatus(await getSynthesisStatus(sessionId));
  // The flagged copy is the static support message - never a DB value, never the classifier's rationale.
  return jsonNoStore(mapped.status === "flagged" ? { ...mapped, message: SUPPORT_MESSAGE } : mapped);
}

// no-store + no-referrer, matching /api/book/[key].
function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}
