import { THEMES, TOTAL_THEMES, CHAPTER_LABELS, themeByKey } from "./spine";
import type { EngineState } from "./engine";

const chapterOf = (key: string) => themeByKey(key)?.chapter ?? 0;

export function chapterLabel(state: EngineState): string {
  return CHAPTER_LABELS[chapterOf(state.current)] ?? "";
}

// 0..1 overall progress, endowed with a small head start so the bar never reads empty (goal-gradient).
// `current` is in flight and not yet counted, so the bar fills as themes actually land.
export function progress(state: EngineState): number {
  return Math.min(1, 0.06 + (state.covered.length / TOTAL_THEMES) * 0.94);
}

// Per-chapter fill (0..1) for the segmented gold rule: covered themes fill their chapter; the in-flight
// `current` shows its own chapter as partway done.
export function chapterFills(state: EngineState): number[] {
  const done = new Set(state.covered);
  const currentChapter = chapterOf(state.current);
  return CHAPTER_LABELS.map((_, ch) => {
    const keys = THEMES.filter((t) => t.chapter === ch);
    const coveredInCh = keys.filter((t) => done.has(t.key)).length;
    const inFlight = currentChapter === ch ? 0.5 : 0;
    return Math.min(1, (coveredInCh + inFlight) / keys.length);
  });
}
