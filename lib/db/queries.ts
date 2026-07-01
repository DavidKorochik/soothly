import { and, eq, lt, notInArray, or, sql } from "drizzle-orm";
import { sessions, transcripts, funnelEvents } from "./schema";
import { persistenceEnabled, withRetry } from "./persistence";
import { STALENESS_MINUTES } from "../synthesis/timing";
import type { Gender } from "../gender";

// schema imports are connection-free, so this module stays safe to import without a DB.
const getDb = async () => (await import("./index")).db;

// now() - STALENESS as a SQL interval, built from the shared constant (see lib/synthesis/timing.ts for
// the load-bearing ordering) so the claim, the staleness read, and the sweeper can never drift. Kept on
// the DB clock everywhere (no app-vs-DB clock mixing).
const staleCutoff = sql`now() - (${STALENESS_MINUTES} * interval '1 minute')`;

export async function createSession(input: {
  name: string;
  gender: Gender;
  age: number;
}): Promise<string> {
  if (!persistenceEnabled()) return crypto.randomUUID();
  const db = await getDb();
  const [row] = await withRetry(() => db.insert(sessions).values(input).returning({ id: sessions.id }));
  return row.id;
}

export async function saveTranscript(input: {
  sessionId: string;
  phase: number;
  questionKey: string;
  questionText: string;
  answer: string;
  meta?: unknown;
}): Promise<void> {
  if (!persistenceEnabled()) return;
  const db = await getDb();
  // The answer is the one irreplaceable write in the interview - retry hard before letting it fail.
  // Retry is at-least-once: a lost response after commit can duplicate the row, but a rare dup beats a lost answer (no idempotency key yet).
  await withRetry(() => db.insert(transcripts).values(input));
}

export async function logFunnel(input: {
  sessionId: string;
  event: string;
  phase?: number;
  questionKey?: string;
  meta?: unknown;
}): Promise<void> {
  // Analytics only - a funnel write must never throw and take down the interview or block the answer save.
  try {
    if (!persistenceEnabled()) return;
    const db = await getDb();
    await db.insert(funnelEvents).values(input);
  } catch (err) {
    console.error("[logFunnel] non-fatal funnel write failed", { event: input.event, err });
  }
}

// Best-effort: mark the session completed. Never throws - this status write runs on the final turn,
// after the answer is already saved, so a transient DB failure here must not 500 the turn and show
// the user an error right when they have actually finished the interview.
export async function completeSession(sessionId: string): Promise<void> {
  try {
    if (!persistenceEnabled()) return;
    const db = await getDb();
    await withRetry(() => db.update(sessions).set({ status: "completed", updatedAt: new Date() }).where(eq(sessions.id, sessionId)));
  } catch (err) {
    console.error("[completeSession] non-fatal completion write failed", { sessionId, err });
  }
}

// Atomically claim the synthesis job for this session. A single conditional UPDATE ... RETURNING is
// atomic in Postgres (row-level lock), so across two concurrent serverless invocations at most one
// flips the row into 'synthesizing' and only that caller gets a row back. Returns true iff THIS call
// won and should run the pipeline. Claimable: any never-started/finished-but-not-done state, OR a stale
// 'synthesizing' orphan. NOT claimable: a fresh in-flight job, a finished book, or a flagged session.
// This is the ONE query whose result is load-bearing (it gates a billed generation), so it surfaces
// true/false rather than swallowing into a no-op - but it must still never throw the route. It is
// deliberately NOT wrapped in withRetry: a retry on a dropped response (the UPDATE already committed)
// would re-find the row 'synthesizing'/not-stale, return 0 rows, and read as a loss though we won.
// By the time this is reached the sync path has already returned, so a false here means lost-claim or
// DB-error -> the caller polls/errors, never "go synchronous".
export async function startSynthesis(sessionId: string): Promise<boolean> {
  if (!persistenceEnabled()) return false; // dev/no-DB: the route runs the synchronous path instead
  try {
    const db = await getDb();
    const [row] = await db
      .update(sessions)
      .set({ status: "synthesizing", synthesisStartedAt: sql`now()`, updatedAt: sql`now()` })
      .where(
        and(
          eq(sessions.id, sessionId),
          or(
            notInArray(sessions.status, ["synthesizing", "synthesized", "flagged"]),
            and(eq(sessions.status, "synthesizing"), lt(sessions.synthesisStartedAt, staleCutoff)),
          ),
        ),
      )
      .returning({ id: sessions.id });
    return !!row;
  } catch (err) {
    // Fail closed on the claim: never assume ownership on a DB error.
    console.error("[startSynthesis] claim failed", { sessionId, err: err instanceof Error ? err.name : "Unknown" });
    return false;
  }
}

// Best-effort: record the finished book and mark it synthesized. Persists title + chapterCount so a
// later reload/poll can show them without re-running synthesis (closes the dropped-title gap). Returns
// false if the write failed, so the caller can flip a stuck 'synthesizing' row to 'failed' rather than
// leave it hanging until staleness. Never throws.
// TODO(accounts): scope to the session owner once auth exists - today any caller with a valid session
// UUID could relink it (low risk: bookKey is not an auth token; the book route serves by key).
export async function completeSynthesis(
  sessionId: string,
  fields: { bookKey: string; title: string; chapterCount: number },
): Promise<boolean> {
  try {
    if (!persistenceEnabled()) return true;
    const db = await getDb();
    await withRetry(() =>
      db
        .update(sessions)
        .set({
          status: "synthesized",
          bookKey: fields.bookKey,
          title: fields.title,
          chapterCount: fields.chapterCount,
          updatedAt: sql`now()`,
        })
        .where(eq(sessions.id, sessionId)),
    );
    return true;
  } catch (err) {
    console.error("[completeSynthesis] non-fatal book link failed", { sessionId, err });
    return false;
  }
}

// Best-effort: mark the session safety-flagged (terminal; not re-claimable). Returns false on write
// failure so the caller can fall back to failSynthesis rather than leave the row stuck 'synthesizing'.
export async function flagSynthesis(sessionId: string): Promise<boolean> {
  try {
    if (!persistenceEnabled()) return true;
    const db = await getDb();
    await withRetry(() => db.update(sessions).set({ status: "flagged", updatedAt: sql`now()` }).where(eq(sessions.id, sessionId)));
    return true;
  } catch (err) {
    console.error("[flagSynthesis] non-fatal flag write failed", { sessionId, err });
    return false;
  }
}

// Best-effort: mark the synthesis failed so the poll endpoint reports an error and a retry can re-claim
// (failed is intentionally NOT in startSynthesis's exclusion list). Never throws.
export async function failSynthesis(sessionId: string): Promise<void> {
  try {
    if (!persistenceEnabled()) return;
    const db = await getDb();
    await withRetry(() => db.update(sessions).set({ status: "failed", updatedAt: sql`now()` }).where(eq(sessions.id, sessionId)));
  } catch (err) {
    console.error("[failSynthesis] non-fatal fail write failed", { sessionId, err });
  }
}

// Read the synthesis result for the poll + idempotency paths. Generalizes the old getSessionBook by
// also returning the persisted title/chapterCount and a DB-computed isStale flag (synthesis_started_at
// older than STALENESS) so callers never compute staleness on the app clock. Fails open: null on
// persistence-off or any error, so a lookup hiccup never blocks book delivery.
export async function getSynthesisStatus(sessionId: string): Promise<{
  status: string;
  bookKey: string | null;
  title: string | null;
  chapterCount: number | null;
  isStale: boolean;
} | null> {
  try {
    if (!persistenceEnabled()) return null;
    const db = await getDb();
    const [row] = await withRetry(() =>
      db
        .select({
          status: sessions.status,
          bookKey: sessions.bookKey,
          title: sessions.title,
          chapterCount: sessions.chapterCount,
          isStale: sql<boolean>`coalesce(${sessions.synthesisStartedAt} < ${staleCutoff}, false)`,
        })
        .from(sessions)
        .where(eq(sessions.id, sessionId)),
    );
    return row ?? null;
  } catch (err) {
    console.error("[getSynthesisStatus] non-fatal session lookup failed", { sessionId, err });
    return null;
  }
}

// Cron sweeper: flip genuinely-stale 'synthesizing' rows (orphaned by a killed/abandoned invocation,
// older than STALENESS) to 'failed' so the data reflects reality and a returning user gets a clean
// retry. The WHERE is scoped so it can never touch a live job (one younger than STALENESS). Returns how
// many rows were swept. Best-effort: 0 on persistence-off or any error.
export async function sweepStaleSyntheses(): Promise<number> {
  try {
    if (!persistenceEnabled()) return 0;
    const db = await getDb();
    const rows = await withRetry(() =>
      db
        .update(sessions)
        .set({ status: "failed", updatedAt: sql`now()` })
        .where(and(eq(sessions.status, "synthesizing"), lt(sessions.synthesisStartedAt, staleCutoff)))
        .returning({ id: sessions.id }),
    );
    return rows.length;
  } catch (err) {
    console.error("[sweepStaleSyntheses] non-fatal sweep failed", { err: err instanceof Error ? err.name : "Unknown" });
    return 0;
  }
}
