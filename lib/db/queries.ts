import { eq } from "drizzle-orm";
import { sessions, transcripts, funnelEvents } from "./schema";

// In dev without a Neon URL the interview still runs end-to-end; persistence simply turns on
// once DATABASE_URL is set. (schema imports are connection-free, so this stays safe to import.)
const configured = () => !!process.env.DATABASE_URL;
const getDb = async () => (await import("./index")).db;

export async function createSession(input: {
  name: string;
  gender: "male" | "female";
  age: number;
}): Promise<string> {
  if (!configured()) return crypto.randomUUID();
  const db = await getDb();
  const [row] = await db.insert(sessions).values(input).returning({ id: sessions.id });
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
  if (!configured()) return;
  const db = await getDb();
  await db.insert(transcripts).values(input);
}

export async function logFunnel(input: {
  sessionId: string;
  event: string;
  phase?: number;
  questionKey?: string;
  meta?: unknown;
}): Promise<void> {
  if (!configured()) return;
  const db = await getDb();
  await db.insert(funnelEvents).values(input);
}

export async function completeSession(sessionId: string): Promise<void> {
  if (!configured()) return;
  const db = await getDb();
  await db.update(sessions).set({ status: "completed", updatedAt: new Date() }).where(eq(sessions.id, sessionId));
}
