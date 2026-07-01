import { NextResponse } from "next/server";
import { sweepStaleSyntheses } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel Cron: flip orphaned 'synthesizing' rows to 'failed' - the case where a user closed the tab
// before their job finished and never returned, so the claim/poll never got a chance to re-heal it.
// Vercel includes "Authorization: Bearer <CRON_SECRET>" on cron requests when CRON_SECRET is set.
// Fail-closed auth: an UNSET secret refuses every request rather than matching "Bearer undefined".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const swept = await sweepStaleSyntheses();
  if (swept > 0) console.warn(`swept ${swept} stale synthesis job(s)`);
  return NextResponse.json({ swept });
}
