import { and, eq, inArray } from "drizzle-orm";
import { sessions, transcripts, feedback, funnelEvents } from "./schema";
import { PHASE1, PHASE2 } from "../interview/spine";
import { chapterLabel } from "../interview/chapters";
import {
  buildSessionList,
  computeCounts,
  computeFunnel,
  computeVoiceStats,
  countDictatedAnswers,
  readEval,
  readFollowupRound,
  VOICE_FAIL,
  VOICE_OK,
  type AdminCounts,
  type AnswerEvalLite,
  type FunnelQuestionStat,
  type SessionListItem,
  type SessionStatus,
  type SpineEntry,
  type VoiceStats,
} from "./funnel";

// Read-only query layer for the internal /admin session microscope. Mirrors the configured()/getDb()
// pattern in queries.ts so it degrades to empty/null when DATABASE_URL is unset. The pure aggregation
// (computeFunnel etc.) lives in ./funnel and is re-exported here.
export { computeFunnel, computeCounts, buildSessionList, computeVoiceStats } from "./funnel";
export type { FunnelQuestionStat, AdminCounts, SessionListItem, SessionStatus, VoiceStats } from "./funnel";

// PHASE1 keys then PHASE2 keys; array position is the flat spine index (0..15). Each entry carries its
// human label + chapter so the pure functions in ./funnel need no spine/chapters import.
export function buildSpineOrder(): SpineEntry[] {
  return [
    ...PHASE1.map((q, index) => ({
      phase: 1 as const,
      index,
      key: q.key,
      label: q.question,
      chapter: chapterLabel(1, index),
    })),
    ...PHASE2.map((q, index) => ({
      phase: 2 as const,
      index,
      key: q.key,
      label: q.question,
      chapter: chapterLabel(2, index),
    })),
  ];
}

const configured = () => !!process.env.DATABASE_URL;
const getDb = async () => (await import("./index")).db;

const SKIP_EVENT = "question_skipped";

export type AdminOverview = {
  counts: AdminCounts;
  scorecard: FunnelQuestionStat[];
  sessions: SessionListItem[];
  voice: VoiceStats;
};

// One fetch, all overview surfaces. Degrades to empty data when DATABASE_URL is unset.
export async function getAdminOverview(): Promise<AdminOverview> {
  const spine = buildSpineOrder();
  if (!configured()) {
    return {
      counts: computeCounts([], []),
      scorecard: computeFunnel([], [], [], spine),
      sessions: [],
      voice: { ...computeVoiceStats([]), dictatedAnswers: 0 },
    };
  }
  const db = await getDb();
  const [sessionRows, transcriptRows, skipRows, feedbackRows, voiceRows] = await Promise.all([
    db.select().from(sessions),
    db
      .select({
        sessionId: transcripts.sessionId,
        questionKey: transcripts.questionKey,
        meta: transcripts.meta,
        createdAt: transcripts.createdAt,
      })
      .from(transcripts),
    db
      .select({ sessionId: funnelEvents.sessionId, questionKey: funnelEvents.questionKey })
      .from(funnelEvents)
      .where(eq(funnelEvents.event, SKIP_EVENT)),
    db
      .select({ sessionId: feedback.sessionId, feltLikeMe: feedback.feltLikeMe, createdAt: feedback.createdAt })
      .from(feedback),
    db
      .select({
        sessionId: funnelEvents.sessionId,
        questionKey: funnelEvents.questionKey,
        event: funnelEvents.event,
        meta: funnelEvents.meta,
      })
      .from(funnelEvents)
      .where(inArray(funnelEvents.event, [VOICE_OK, VOICE_FAIL])),
  ]);
  return {
    counts: computeCounts(sessionRows, feedbackRows),
    scorecard: computeFunnel(sessionRows, transcriptRows, skipRows, spine),
    sessions: buildSessionList(sessionRows, transcriptRows, skipRows, feedbackRows, spine),
    voice: {
      ...computeVoiceStats(voiceRows),
      dictatedAnswers: countDictatedAnswers(transcriptRows, skipRows, voiceRows, spine),
    },
  };
}

export type DetailBlock = {
  phase: number;
  index: number; // within-phase index (for chapterLabel)
  chapter: string;
  questionKey: string;
  questionText: string;
  answer: string;
  eval: AnswerEvalLite | null;
  followupRound: number | null;
  skipped: boolean;
  dictated: boolean; // the question had >=1 successful voice transcription (attributed by questionKey)
  timeOnQuestionSec: number | null;
};

export type SessionDetail = {
  session: {
    id: string;
    name: string;
    gender: "male" | "female";
    age: number;
    status: SessionStatus;
    createdAt: Date;
    totalDurationSec: number | null;
  };
  blocks: DetailBlock[];
  feedback: {
    feltLikeMe: number | null;
    hardestLine: string | null;
    feltGeneric: string | null;
    note: string | null;
    createdAt: Date;
  } | null;
};

// The microscope: one block PER TRANSCRIPT ROW (follow-ups keep their verbatim answers), ordered by
// spine position then chronology. Returns null when unconfigured or the session does not exist.
export async function getSessionDetail(id: string): Promise<SessionDetail | null> {
  if (!configured()) return null;
  const db = await getDb();

  const sessionRows = await db.select().from(sessions).where(eq(sessions.id, id));
  const s = sessionRows[0];
  if (!s) return null;

  const [transcriptRows, skipRows, feedbackRows, voiceRows] = await Promise.all([
    db
      .select({
        phase: transcripts.phase,
        questionKey: transcripts.questionKey,
        questionText: transcripts.questionText,
        answer: transcripts.answer,
        meta: transcripts.meta,
        createdAt: transcripts.createdAt,
      })
      .from(transcripts)
      .where(eq(transcripts.sessionId, id)),
    db
      .select({ questionKey: funnelEvents.questionKey })
      .from(funnelEvents)
      .where(and(eq(funnelEvents.sessionId, id), eq(funnelEvents.event, SKIP_EVENT))),
    db.select().from(feedback).where(eq(feedback.sessionId, id)),
    db
      .select({ questionKey: funnelEvents.questionKey })
      .from(funnelEvents)
      .where(and(eq(funnelEvents.sessionId, id), eq(funnelEvents.event, VOICE_OK))),
  ]);

  const spine = buildSpineOrder();
  const keyToIndex = new Map(spine.map((e, i) => [e.key, i] as const));
  const skippedKeys = new Set<string>();
  for (const sk of skipRows) if (sk.questionKey) skippedKeys.add(sk.questionKey);
  const dictatedKeys = new Set<string>();
  for (const v of voiceRows) if (v.questionKey) dictatedKeys.add(v.questionKey);

  const chrono = transcriptRows.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const enriched = chrono.map((t, i) => {
    const flat = keyToIndex.get(t.questionKey);
    const entry = flat !== undefined ? spine[flat] : undefined;
    const block: DetailBlock = {
      phase: t.phase,
      index: entry ? entry.index : 0,
      chapter: entry ? entry.chapter : "",
      questionKey: t.questionKey,
      questionText: t.questionText,
      answer: t.answer,
      eval: readEval(t.meta),
      followupRound: readFollowupRound(t.meta),
      skipped: skippedKeys.has(t.questionKey),
      dictated: dictatedKeys.has(t.questionKey),
      timeOnQuestionSec: i === 0 ? null : (t.createdAt.getTime() - chrono[i - 1].createdAt.getTime()) / 1000,
    };
    return { sortKey: flat ?? Number.MAX_SAFE_INTEGER, block };
  });
  // Stable sort keeps chronological order within a question (follow-ups after their original).
  enriched.sort((a, b) => a.sortKey - b.sortKey);

  const latestFeedback = feedbackRows.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  return {
    session: {
      id: s.id,
      name: s.name,
      gender: s.gender,
      age: s.age,
      status: s.status,
      createdAt: s.createdAt,
      totalDurationSec: chrono.length
        ? (chrono[chrono.length - 1].createdAt.getTime() - s.createdAt.getTime()) / 1000
        : null,
    },
    blocks: enriched.map((e) => e.block),
    feedback: latestFeedback
      ? {
          feltLikeMe: latestFeedback.feltLikeMe,
          hardestLine: latestFeedback.hardestLine,
          feltGeneric: latestFeedback.feltGeneric,
          note: latestFeedback.note,
          createdAt: latestFeedback.createdAt,
        }
      : null,
  };
}
