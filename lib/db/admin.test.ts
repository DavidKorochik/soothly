import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFunnel,
  computeVoiceStats,
  countDictatedAnswers,
  type FunnelSessionRow,
  type FunnelTranscriptRow,
  type FunnelSkipRow,
  type VoiceEventRow,
} from "./funnel.ts";
import { PHASE1, PHASE2 } from "../interview/spine.ts";

// label/chapter are not asserted here, so leave chapter blank; computeFunnel just copies them through.
const spineOrder = [
  ...PHASE1.map((q, index) => ({ phase: 1 as const, index, key: q.key, label: q.question, chapter: "" })),
  ...PHASE2.map((q, index) => ({ phase: 2 as const, index, key: q.key, label: q.question, chapter: "" })),
];

const d = (sec: number) => new Date(2026, 0, 1, 0, 0, sec);
const ev = (depth: number) => ({ eval: { depth, hasScene: true, hasFeeling: true }, followupRound: 0 });
const noEval = (followupRound = 0) => ({ eval: null, followupRound });
const tr = (sessionId: string, questionKey: string, sec: number, meta: unknown): FunnelTranscriptRow => ({
  sessionId,
  questionKey,
  meta,
  createdAt: d(sec),
});

// S1 completed (deep), S2 quit at roots, S3 skipped roots then quit, S4 follow-up on roots then quit,
// S5 intake-only (no transcripts). Spine flat indices: now=0, why_now=1, roots=2, childhood=3, turning=4.
const sessionRows: FunnelSessionRow[] = [
  { id: "S1", status: "completed" },
  { id: "S2", status: "in_progress" },
  { id: "S3", status: "in_progress" },
  { id: "S4", status: "in_progress" },
  { id: "S5", status: "in_progress" },
];

const transcriptRows: FunnelTranscriptRow[] = [
  tr("S1", "now", 0, noEval()),
  tr("S1", "why_now", 10, noEval()),
  tr("S1", "roots", 40, ev(4)),
  tr("S1", "childhood", 70, ev(2)),

  tr("S2", "now", 0, noEval()),
  tr("S2", "why_now", 5, noEval()),
  tr("S2", "roots", 20, ev(2)),

  tr("S3", "now", 0, noEval()),
  tr("S3", "why_now", 8, noEval()),
  tr("S3", "roots", 30, noEval()), // skip row: real transcript, eval null

  tr("S4", "now", 0, noEval()),
  tr("S4", "why_now", 6, noEval()),
  tr("S4", "roots", 20, ev(2)), // original thin answer
  tr("S4", "roots", 35, { eval: { depth: 4, hasScene: true, hasFeeling: true }, followupRound: 1 }), // follow-up
];

const skipRows: FunnelSkipRow[] = [{ sessionId: "S3", questionKey: "roots" }];

const funnel = computeFunnel(sessionRows, transcriptRows, skipRows, spineOrder);
const byKey = new Map(funnel.map((r) => [r.key, r]));

// reached / answered / skipped / droppedHere — recomputed by hand from the fixture.
const counts: { key: string; field: "reached" | "answered" | "skipped" | "droppedHere"; expected: number }[] = [
  { key: "now", field: "reached", expected: 4 }, // S5 (no transcripts) excluded
  { key: "why_now", field: "reached", expected: 4 },
  { key: "roots", field: "reached", expected: 4 },
  { key: "childhood", field: "reached", expected: 1 }, // only S1
  { key: "turning", field: "reached", expected: 0 },

  { key: "roots", field: "answered", expected: 3 }, // S1, S2, S4 (S3 skipped, deduped follow-up)
  { key: "childhood", field: "answered", expected: 1 },

  { key: "roots", field: "skipped", expected: 1 }, // S3

  { key: "roots", field: "droppedHere", expected: 3 }, // S2, S3, S4 (S1 completed; S5 furthest -1)
  { key: "childhood", field: "droppedHere", expected: 0 }, // S1 reaches it but is completed
  { key: "now", field: "droppedHere", expected: 0 },
  { key: "why_now", field: "droppedHere", expected: 0 },
];

for (const c of counts) {
  test(`computeFunnel: ${c.key}.${c.field} === ${c.expected}`, () => {
    assert.equal(byKey.get(c.key)?.[c.field], c.expected);
  });
}

test("avgDepth averages all eval'd rows (incl. follow-up), excludes skips and phase-1", () => {
  assert.equal(byKey.get("roots")?.avgDepth, 3); // mean(4, 2, 2, 4); S3 skip (eval null) excluded
  assert.equal(byKey.get("childhood")?.avgDepth, 2);
  assert.equal(byKey.get("now")?.avgDepth, null); // phase-1, never evaluated
  assert.equal(byKey.get("turning")?.avgDepth, null); // no samples
});

test("avgTimeSec sums per-session deltas, excludes the skipping session, nulls the first row", () => {
  assert.equal(byKey.get("now")?.avgTimeSec, null); // first row in every session -> no predecessor
  assert.equal(byKey.get("childhood")?.avgTimeSec, 30); // only S1: 70 - 40
  assert.equal(byKey.get("why_now")?.avgTimeSec, 29 / 4); // (10 + 5 + 8 + 6) / 4 = 7.25
  // S1=30, S2=15, S4=14+15=29 (per-session sum); S3's skip delta (22) excluded.
  const roots = byKey.get("roots")?.avgTimeSec ?? NaN;
  assert.ok(Math.abs(roots - 74 / 3) < 1e-9, `roots.avgTimeSec ${roots} !== 74/3`);
});

test("computeFunnel on empty inputs yields one zeroed row per spine entry", () => {
  const empty = computeFunnel([], [], [], spineOrder);
  assert.equal(empty.length, spineOrder.length);
  for (const r of empty) {
    assert.equal(r.reached, 0);
    assert.equal(r.answered, 0);
    assert.equal(r.skipped, 0);
    assert.equal(r.droppedHere, 0);
    assert.equal(r.avgDepth, null);
    assert.equal(r.avgTimeSec, null);
  }
});

// Voice: S1 dictated roots (twice -> one answer) + childhood; S2 dictated now then failed on roots;
// S3 only failures (one with no questionKey); S4 a fail with no error code -> "unknown".
const voiceRows: VoiceEventRow[] = [
  { sessionId: "S1", questionKey: "roots", event: "voice_transcribed", meta: { bytes: 1, chars: 10 } },
  { sessionId: "S1", questionKey: "roots", event: "voice_transcribed", meta: { bytes: 1, chars: 4 } },
  { sessionId: "S1", questionKey: "childhood", event: "voice_transcribed", meta: {} },
  { sessionId: "S2", questionKey: "now", event: "voice_transcribed", meta: {} },
  { sessionId: "S2", questionKey: "roots", event: "voice_transcribe_failed", meta: { code: "rate_limit" } },
  { sessionId: "S3", questionKey: null, event: "voice_transcribe_failed", meta: { code: "timeout" } },
  { sessionId: "S3", questionKey: "now", event: "voice_transcribe_failed", meta: { code: "rate_limit" } },
  { sessionId: "S4", questionKey: "now", event: "voice_transcribe_failed", meta: null },
];

test("computeVoiceStats counts adoption, dictations, and failures by code", () => {
  const vs = computeVoiceStats(voiceRows);
  assert.equal(vs.sessionsUsingVoice, 2); // S1, S2 have a success; S3/S4 only failed
  assert.equal(vs.dictations, 4); // four success events
  assert.equal(vs.failures, 4);
  // descending by count; equal counts keep first-seen order (rate_limit before timeout/unknown)
  assert.deepEqual(vs.failuresByCode, [
    { code: "rate_limit", count: 2 },
    { code: "timeout", count: 1 },
    { code: "unknown", count: 1 },
  ]);
});

test("computeVoiceStats on empty input is fully zeroed", () => {
  assert.deepEqual(computeVoiceStats([]), {
    sessionsUsingVoice: 0,
    dictations: 0,
    failures: 0,
    failuresByCode: [],
  });
});

// countDictatedAnswers is a strict subset of "answered": only submitted, non-skipped, in-spine pairs
// with a successful dictation count. dictate-then-skip, dictate-then-abandon, and non-spine keys drop out.
test("countDictatedAnswers counts only submitted, non-skipped, dictated answers", () => {
  const dictTranscripts = [
    { sessionId: "S1", questionKey: "roots" }, // answered + dictated
    { sessionId: "S1", questionKey: "childhood" }, // answered + dictated
    { sessionId: "S2", questionKey: "now" }, // answered + dictated
    { sessionId: "S2", questionKey: "roots" }, // dictated but SKIPPED -> excluded
  ];
  const dictSkips: FunnelSkipRow[] = [{ sessionId: "S2", questionKey: "roots" }];
  const dictVoice: VoiceEventRow[] = [
    { sessionId: "S1", questionKey: "roots", event: "voice_transcribed", meta: {} },
    { sessionId: "S1", questionKey: "roots", event: "voice_transcribed", meta: {} }, // dup pair, deduped
    { sessionId: "S1", questionKey: "childhood", event: "voice_transcribed", meta: {} },
    { sessionId: "S2", questionKey: "now", event: "voice_transcribed", meta: {} },
    { sessionId: "S2", questionKey: "roots", event: "voice_transcribed", meta: {} }, // dictated then skipped
    { sessionId: "S3", questionKey: "now", event: "voice_transcribed", meta: {} }, // abandoned, no transcript
    { sessionId: "S9", questionKey: "not_a_key", event: "voice_transcribed", meta: {} }, // non-spine
    { sessionId: "S1", questionKey: "roots", event: "voice_transcribe_failed", meta: {} }, // failure ignored
  ];
  assert.equal(countDictatedAnswers(dictTranscripts, dictSkips, dictVoice, spineOrder), 3);
  assert.equal(countDictatedAnswers([], [], [], spineOrder), 0);
});
