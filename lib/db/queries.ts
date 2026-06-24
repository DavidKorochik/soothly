import { eq } from "drizzle-orm";
import { sessions, transcripts, funnelEvents } from "./schema";
import { persistenceEnabled, withRetry } from "./persistence";

// schema imports are connection-free, so this module stays safe to import without a DB.
const getDb = async () => (await import("./index")).db;

export async function createSession(input: {
  name: string;
  gender: "male" | "female";
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

export async function completeSession(sessionId: string): Promise<void> {
  if (!persistenceEnabled()) return;
  const db = await getDb();
  await withRetry(() => db.update(sessions).set({ status: "completed", updatedAt: new Date() }).where(eq(sessions.id, sessionId)));
}

// Best-effort: link the stored book to its session and mark it synthesized. Never throws - a link
// failure must not deny the user the book they just generated (the key is still returned to them).
// TODO(accounts): scope this to the session owner once auth exists - today any caller with a valid
// session UUID could relink it (low risk: bookKey is not an auth token; the book route serves by key).
export async function setBookKey(sessionId: string, bookKey: string): Promise<void> {
  try {
    if (!persistenceEnabled()) return;
    const db = await getDb();
    await withRetry(() =>
      db.update(sessions).set({ status: "synthesized", bookKey, updatedAt: new Date() }).where(eq(sessions.id, sessionId)),
    );
  } catch (err) {
    console.error("[setBookKey] non-fatal book link failed", { sessionId, err });
  }
}
