import { PHASE1_LEN, PHASE2_LEN, questionAt } from "./spine";
import type { Phase } from "./engine";

// Named chapters for the progress rule - the interview reads as a few short arcs, never "Q 7 of 16".
export const CHAPTERS: { label: string; keys: string[] }[] = [
  { label: "הסיפור מתחיל", keys: ["now", "why_now"] },
  { label: "מאיפה באת", keys: ["roots", "childhood"] },
  { label: "רגעים שעיצבו אותך", keys: ["turning", "decision", "hardship", "failure"] },
  { label: "אנשים, דפוסים, צללים", keys: ["people", "pattern", "fear", "shadow"] },
  { label: "מי שנהיית", keys: ["insight", "change"] },
  { label: "ולאן מכאן", keys: ["future", "pride"] },
];

export function chapterLabel(phase: Phase, index: number): string {
  const key = questionAt(phase, index)?.key;
  return CHAPTERS.find((c) => key && c.keys.includes(key))?.label ?? "";
}

// 0..1, with an endowed jump to ~18% the moment the warm-up ends (goal-gradient / endowed progress).
export function progress(phase: Phase, index: number): number {
  if (phase === 1) return (index / PHASE1_LEN) * 0.1;
  return 0.18 + (index / PHASE2_LEN) * 0.82;
}

// Per-chapter fill (0..1) for the segmented progress: past chapters full, the current one partial.
export function chapterFills(phase: Phase, index: number): number[] {
  const key = questionAt(phase, index)?.key;
  const current = CHAPTERS.findIndex((c) => key !== undefined && c.keys.includes(key));
  return CHAPTERS.map((c, i) => {
    if (current === -1 || i > current) return 0;
    if (i < current) return 1;
    return Math.min(1, (c.keys.indexOf(key!) + 1) / c.keys.length);
  });
}
