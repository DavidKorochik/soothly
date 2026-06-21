// Pure aggregation for the /admin session microscope — ZERO imports so it loads under
// `node --experimental-strip-types` and is unit-testable on fixtures. The label/chapter for each
// question are carried on SpineEntry (filled by buildSpineOrder in admin.ts) so this module needs no
// spine/chapters import. Re-exported from admin.ts, which is where the brief expects computeFunnel.

export type SessionStatus = "in_progress" | "completed" | "flagged" | "synthesized";

// Minimal structural inputs — real Drizzle rows AND light test fixtures both satisfy these.
export type FunnelSessionRow = { id: string; status: SessionStatus };
export type FunnelTranscriptRow = { sessionId: string; questionKey: string; meta: unknown; createdAt: Date };
export type FunnelSkipRow = { sessionId: string | null; questionKey: string | null };
export type FeedbackLite = { sessionId: string; feltLikeMe: number | null; createdAt: Date };
export type SpineEntry = { phase: 1 | 2; index: number; key: string; label: string; chapter: string };
export type AnswerEvalLite = { depth: number; hasScene: boolean; hasFeeling: boolean };

const PAIR = "::"; // separator for `${sessionId}::${key}` composite map keys

// Validate the persisted meta.eval shape (camelCase) before reading; null for phase-1 and skip rows.
export function readEval(meta: unknown): AnswerEvalLite | null {
  if (typeof meta !== "object" || meta === null) return null;
  const ev = (meta as { eval?: unknown }).eval;
  if (typeof ev !== "object" || ev === null) return null;
  const e = ev as Record<string, unknown>;
  if (typeof e.depth !== "number" || typeof e.hasScene !== "boolean" || typeof e.hasFeeling !== "boolean") {
    return null;
  }
  return { depth: e.depth, hasScene: e.hasScene, hasFeeling: e.hasFeeling };
}

export function readFollowupRound(meta: unknown): number | null {
  if (typeof meta !== "object" || meta === null) return null;
  const r = (meta as { followupRound?: unknown }).followupRound;
  return typeof r === "number" ? r : null;
}

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export type FunnelQuestionStat = {
  key: string;
  label: string;
  chapter: string;
  reached: number;
  answered: number;
  skipped: number;
  droppedHere: number;
  avgDepth: number | null;
  avgTimeSec: number | null;
};

// Per-question drop-off + health, one row per spine entry in interview order. PURE.
export function computeFunnel(
  sessionRows: FunnelSessionRow[],
  transcriptRows: FunnelTranscriptRow[],
  skipRows: FunnelSkipRow[],
  spineOrder: SpineEntry[],
): FunnelQuestionStat[] {
  const keyToIndex = new Map<string, number>();
  spineOrder.forEach((e, i) => keyToIndex.set(e.key, i));

  const statusById = new Map<string, SessionStatus>();
  for (const s of sessionRows) statusById.set(s.id, s.status);

  // Each session's transcripts, ascending by createdAt (equal stamps -> 0s delta).
  const bySession = new Map<string, FunnelTranscriptRow[]>();
  for (const t of transcriptRows) {
    const list = bySession.get(t.sessionId);
    if (list) list.push(t);
    else bySession.set(t.sessionId, [t]);
  }
  for (const list of bySession.values()) list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Skipped sessions per key (a skip writes both a question_skipped event and a transcript row).
  const skipByKey = new Map<string, Set<string>>();
  for (const sk of skipRows) {
    if (!sk.sessionId || !sk.questionKey || !keyToIndex.has(sk.questionKey)) continue;
    let set = skipByKey.get(sk.questionKey);
    if (!set) skipByKey.set(sk.questionKey, (set = new Set()));
    set.add(sk.sessionId);
  }

  // furthestIndex per session: max flat index over its transcript keys (skips count — a skip is a
  // forward move). Sessions with no transcripts are absent here and treated as -1.
  const furthestBySession = new Map<string, number>();
  for (const [sid, list] of bySession) {
    let max = -1;
    for (const t of list) {
      const idx = keyToIndex.get(t.questionKey);
      if (idx !== undefined && idx > max) max = idx;
    }
    furthestBySession.set(sid, max);
  }

  // Sessions present per key (dedupe), eval depths per key (transcript-level), and time-on-question
  // summed per (session, key) (session-level). A row's inbound delta is measured from the previous
  // chronological row — so a skip/phase-1 row still ANCHORS the next row's delta even when its own
  // time is later excluded.
  const presentByKey = new Map<string, Set<string>>();
  const depthByKey = new Map<string, number[]>();
  const timeByPair = new Map<string, number>();
  for (const [sid, list] of bySession) {
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      const key = t.questionKey;
      if (!keyToIndex.has(key)) continue;

      let pset = presentByKey.get(key);
      if (!pset) presentByKey.set(key, (pset = new Set()));
      pset.add(sid);

      const ev = readEval(t.meta);
      if (ev) {
        let arr = depthByKey.get(key);
        if (!arr) depthByKey.set(key, (arr = []));
        arr.push(ev.depth);
      }

      if (i > 0) {
        const deltaSec = (t.createdAt.getTime() - list[i - 1].createdAt.getTime()) / 1000;
        const pair = `${sid}${PAIR}${key}`;
        timeByPair.set(pair, (timeByPair.get(pair) ?? 0) + deltaSec);
      }
    }
  }

  return spineOrder.map((entry, index) => {
    const key = entry.key;

    let reached = 0;
    let droppedHere = 0;
    for (const [sid] of bySession) {
      const fi = furthestBySession.get(sid) ?? -1;
      if (fi >= index) reached++;
      if (fi === index) {
        const status = statusById.get(sid);
        if (status !== "completed" && status !== "synthesized") droppedHere++;
      }
    }

    const skippedSet = skipByKey.get(key) ?? new Set<string>();
    const presentSet = presentByKey.get(key) ?? new Set<string>();

    let answered = 0;
    const timeSamples: number[] = [];
    for (const sid of presentSet) {
      if (skippedSet.has(sid)) continue; // skip excluded from "answered" and from its own avg-time
      answered++;
      const v = timeByPair.get(`${sid}${PAIR}${key}`);
      if (v !== undefined) timeSamples.push(v);
    }

    return {
      key,
      label: entry.label,
      chapter: entry.chapter,
      reached,
      answered,
      skipped: skippedSet.size,
      droppedHere,
      avgDepth: mean(depthByKey.get(key) ?? []),
      avgTimeSec: mean(timeSamples),
    };
  });
}

export type AdminCounts = {
  started: number;
  completed: number;
  synthesized: number;
  flagged: number;
  feedbackCount: number;
  avgFeltLikeMe: number | null;
};

// started = total sessions. "Finished" = completed + synthesized (today synthesized is never written).
export function computeCounts(
  sessionRows: FunnelSessionRow[],
  feedbackRows: { feltLikeMe: number | null }[],
): AdminCounts {
  let completed = 0;
  let synthesized = 0;
  let flagged = 0;
  for (const s of sessionRows) {
    if (s.status === "completed") completed++;
    else if (s.status === "synthesized") synthesized++;
    else if (s.status === "flagged") flagged++;
  }
  const felt = feedbackRows.map((f) => f.feltLikeMe).filter((v): v is number => typeof v === "number");
  return {
    started: sessionRows.length,
    completed,
    synthesized,
    flagged,
    feedbackCount: feedbackRows.length,
    avgFeltLikeMe: mean(felt),
  };
}

export type SessionFullRow = {
  id: string;
  name: string;
  gender: "male" | "female";
  age: number;
  status: SessionStatus;
  createdAt: Date;
};

export type SessionListItem = {
  id: string;
  name: string;
  gender: "male" | "female";
  age: number;
  status: SessionStatus;
  createdAt: Date;
  answerCount: number;
  furthestLabel: string;
  completed: boolean;
  durationSec: number | null;
  feltLikeMe: number | null;
};

// Per-session derived fields for the list, newest-first. PURE.
export function buildSessionList(
  sessionRows: SessionFullRow[],
  transcriptRows: { sessionId: string; questionKey: string; createdAt: Date }[],
  skipRows: FunnelSkipRow[],
  feedbackRows: FeedbackLite[],
  spineOrder: SpineEntry[],
): SessionListItem[] {
  const keyToIndex = new Map(spineOrder.map((e, i) => [e.key, i] as const));

  const bySession = new Map<string, { questionKey: string; createdAt: Date }[]>();
  for (const t of transcriptRows) {
    const list = bySession.get(t.sessionId);
    if (list) list.push(t);
    else bySession.set(t.sessionId, [t]);
  }

  const skipPair = new Set<string>();
  for (const sk of skipRows) if (sk.sessionId && sk.questionKey) skipPair.add(`${sk.sessionId}${PAIR}${sk.questionKey}`);

  const latestFelt = new Map<string, FeedbackLite>();
  for (const f of feedbackRows) {
    const prev = latestFelt.get(f.sessionId);
    if (!prev || f.createdAt.getTime() > prev.createdAt.getTime()) latestFelt.set(f.sessionId, f);
  }

  const items = sessionRows.map((s) => {
    const list = (bySession.get(s.id) ?? []).slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const answeredKeys = new Set<string>();
    let furthestIdx = -1;
    for (const t of list) {
      const idx = keyToIndex.get(t.questionKey);
      if (idx === undefined) continue;
      if (idx > furthestIdx) furthestIdx = idx;
      if (!skipPair.has(`${s.id}${PAIR}${t.questionKey}`)) answeredKeys.add(t.questionKey);
    }

    const furthest = furthestIdx >= 0 ? spineOrder[furthestIdx] : undefined;
    return {
      id: s.id,
      name: s.name,
      gender: s.gender,
      age: s.age,
      status: s.status,
      createdAt: s.createdAt,
      answerCount: answeredKeys.size,
      furthestLabel: furthest ? furthest.chapter : "",
      completed: s.status === "completed" || s.status === "synthesized",
      durationSec: list.length ? (list[list.length - 1].createdAt.getTime() - s.createdAt.getTime()) / 1000 : null,
      feltLikeMe: latestFelt.get(s.id)?.feltLikeMe ?? null,
    };
  });

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return items;
}

// Voice/transcription funnel events (logged by the /transcribe route). The saved transcript text is
// identical whether dictated or typed, so these events are the ONLY signal of voice usage.
export const VOICE_OK = "voice_transcribed";
export const VOICE_FAIL = "voice_transcribe_failed";

export type VoiceEventRow = { sessionId: string | null; questionKey: string | null; event: string; meta: unknown };

export type VoiceStats = {
  sessionsUsingVoice: number; // distinct sessions with >=1 successful dictation
  dictatedAnswers: number; // answered (submitted, non-skipped) questions that were dictated — see countDictatedAnswers
  dictations: number; // total successful transcription calls
  failures: number; // total failed transcription calls
  failuresByCode: { code: string; count: number }[]; // descending by count
};

const failCode = (meta: unknown): string => {
  if (typeof meta === "object" && meta !== null) {
    const c = (meta as { code?: unknown }).code;
    if (typeof c === "string" && c) return c;
  }
  return "unknown";
};

// Voice adoption + transcription reliability, derivable purely from the events. dictatedAnswers is NOT
// here: a voice_transcribed event fires at transcription time (before submit, no skip/spine filter), so
// counting answered+dictated questions needs the transcripts — see countDictatedAnswers. PURE.
export function computeVoiceStats(rows: VoiceEventRow[]): Omit<VoiceStats, "dictatedAnswers"> {
  const sessions = new Set<string>();
  const codeCounts = new Map<string, number>();
  let dictations = 0;
  let failures = 0;
  for (const r of rows) {
    if (r.event === VOICE_OK) {
      dictations++;
      if (r.sessionId) sessions.add(r.sessionId);
    } else if (r.event === VOICE_FAIL) {
      failures++;
      const code = failCode(r.meta);
      codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
    }
  }
  return {
    sessionsUsingVoice: sessions.size,
    dictations,
    failures,
    failuresByCode: [...codeCounts.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count),
  };
}

// Count of answered (submitted, non-skipped, in-spine) (session, question) pairs that had >=1 successful
// dictation. A strict subset of computeFunnel's "answered", so it is a valid numerator for the dictation
// share (never exceeds the answered total). PURE.
export function countDictatedAnswers(
  transcriptRows: { sessionId: string; questionKey: string }[],
  skipRows: FunnelSkipRow[],
  voiceRows: VoiceEventRow[],
  spineOrder: SpineEntry[],
): number {
  const inSpine = new Set(spineOrder.map((e) => e.key));
  const skipped = new Set<string>();
  for (const sk of skipRows) if (sk.sessionId && sk.questionKey) skipped.add(`${sk.sessionId}${PAIR}${sk.questionKey}`);

  const answered = new Set<string>();
  for (const t of transcriptRows) {
    if (!inSpine.has(t.questionKey)) continue;
    const pair = `${t.sessionId}${PAIR}${t.questionKey}`;
    if (!skipped.has(pair)) answered.add(pair);
  }

  const dictated = new Set<string>();
  for (const v of voiceRows) {
    if (v.event !== VOICE_OK || !v.sessionId || !v.questionKey) continue;
    const pair = `${v.sessionId}${PAIR}${v.questionKey}`;
    if (answered.has(pair)) dictated.add(pair);
  }
  return dictated.size;
}
