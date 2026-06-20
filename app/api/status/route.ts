import { NextResponse } from "next/server";
import { getServiceStatus } from "@/lib/status/check";

export const runtime = "nodejs";
// Render per request (never prerender at build, which would bake a stale snapshot into the deploy
// and couple the build to the vendor feeds). Freshness/cost are bounded by the upstream fetches,
// which cache on a 60s window - so steady client polling costs at most one request per provider
// per minute.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getServiceStatus());
}
