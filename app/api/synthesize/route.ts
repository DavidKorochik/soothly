import { after, NextResponse } from "next/server";
import { z } from "zod";
import { generateBook } from "@/lib/synthesis/pipeline";
import { persistenceEnabled } from "@/lib/db/persistence";
import {
  startSynthesis,
  completeSynthesis,
  flagSynthesis,
  failSynthesis,
  getSynthesisStatus,
} from "@/lib/db/queries";
import { SUPPORT_MESSAGE } from "@/lib/safety/decide";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Synthesis runs in an after() background job, not in the response. after() is bounded by maxDuration,
// and Fluid Compute (enabled) lifts the Pro cap past 300s, so the ~315s worst case has real headroom.
// Kept a literal (Next statically analyzes route config) but must equal MAX_DURATION_SECONDS in
// lib/synthesis/timing.ts, where timing.test.ts guards the cap < staleness < poll-ceiling ordering.
export const maxDuration = 600;

const InputSchema = z.object({
  sessionId: z.string().uuid().optional(), // present from the interview; absent from the internal test page
  name: z.string().trim().min(1),
  gender: z.enum(["male", "female", "neutral"]),
  age: z.coerce.number().int().min(1).max(120),
  answers: z.string().trim().min(1).max(100000),
});

type SynthInput = Omit<z.infer<typeof InputSchema>, "sessionId">;

// The background job: run the full pipeline, then persist the terminal state. Runs inside the request's
// maxDuration via after(). Logs only error.name - never the raw error, which can carry the subject's
// stories. A failed terminal write flips the row to 'failed' so it can't sit stuck in 'synthesizing'.
async function runJob(sessionId: string, input: SynthInput): Promise<void> {
  try {
    const result = await generateBook(input);
    if (result.status === "flagged") {
      if (!(await flagSynthesis(sessionId))) await failSynthesis(sessionId);
      return;
    }
    const linked = await completeSynthesis(sessionId, {
      bookKey: result.key,
      title: result.title,
      chapterCount: result.chapters,
    });
    if (!linked) {
      // The book is stored in blob but its key didn't persist; log it for recovery, then fail so the
      // user gets a prompt retry instead of a row stuck in 'synthesizing'.
      console.error("synthesis stored a book but the link write failed", { sessionId, bookKey: result.key });
      await failSynthesis(sessionId);
    }
  } catch (error) {
    console.error("async synthesis failed", error instanceof Error ? error.name : "Unknown");
    await failSynthesis(sessionId);
  }
}

export async function POST(req: Request) {
  let input: z.infer<typeof InputSchema>;
  try {
    input = InputSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ status: "error", message: "משהו לא נראה תקין. אפשר לנסות שוב." }, { status: 400 });
  }

  const { sessionId, ...synthInput } = input;

  // The split is purely "sessionId present AND persistenceEnabled()" -> async; else -> sync. It is NOT
  // prod-vs-dev: dev with a DATABASE_URL set deliberately exercises the async path too. Do not gate on
  // process.env.VERCEL. persistenceEnabled() throws on Vercel-without-DB by design (a misconfig the
  // interview itself fails first); the sync branch's try/catch would not run there since this is reached first.
  if (sessionId && persistenceEnabled()) {
    return handleAsync(sessionId, synthInput);
  }

  // Sync fallback: local dev without a DB, or the internal test page (no sessionId). No 300s cap matters
  // locally; the internal tool keeps today's blocking behavior. Intentionally title-less (no DB row).
  try {
    const result = await generateBook(synthInput);
    if (result.status === "flagged") {
      return NextResponse.json({ status: "flagged", message: result.message });
    }
    return NextResponse.json({ status: "ok", url: `/api/book/${result.key}`, title: result.title, chapters: result.chapters });
  } catch (error) {
    console.error("synthesis pipeline failed", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json({ status: "error", message: "משהו השתבש ביצירת הספר. אפשר לנסות שוב." }, { status: 500 });
  }
}

async function handleAsync(sessionId: string, synthInput: SynthInput) {
  // Idempotency: a finished or flagged session short-circuits before any claim, so a reload after
  // completion never re-runs and the persisted title rides along.
  const existing = await getSynthesisStatus(sessionId);
  if (existing?.status === "synthesized" && existing.bookKey) {
    return NextResponse.json({
      status: "ok",
      url: `/api/book/${existing.bookKey}`,
      title: existing.title ?? undefined,
      chapters: existing.chapterCount ?? undefined,
    });
  }
  if (existing?.status === "flagged") {
    return NextResponse.json({ status: "flagged", message: SUPPORT_MESSAGE });
  }

  // Atomic claim. The winner schedules the background job; everyone else polls.
  if (await startSynthesis(sessionId)) {
    after(() => runJob(sessionId, synthInput));
    return NextResponse.json({ status: "pending" });
  }

  // Lost the claim OR the claim errored. Re-check once to disambiguate: a genuine in-flight/finished
  // job means poll/serve; a claim error (row still completed/in_progress/unknown, no job scheduled)
  // means surface an error now instead of polling a non-existent job until the client's ceiling.
  const current = await getSynthesisStatus(sessionId);
  if (current?.status === "synthesizing") return NextResponse.json({ status: "pending" });
  if (current?.status === "synthesized" && current.bookKey) {
    return NextResponse.json({
      status: "ok",
      url: `/api/book/${current.bookKey}`,
      title: current.title ?? undefined,
      chapters: current.chapterCount ?? undefined,
    });
  }
  if (current?.status === "flagged") return NextResponse.json({ status: "flagged", message: SUPPORT_MESSAGE });
  return NextResponse.json({ status: "error", message: "משהו השתבש ביצירת הספר. אפשר לנסות שוב." }, { status: 500 });
}
