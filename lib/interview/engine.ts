export type EngineState = {
  current: string; // theme key just asked, whose answer is now arriving
  covered: string[]; // theme keys done (asked or already told) — never asked again; excludes `current`
  followups: number; // how many times we've deepened on `current`
  deepens: number; // total deepens across the whole interview — bounds length so a charged run can't marathon
};

// The planner's read of an answer, in engine terms (see lib/interview/planner.ts).
export type Plan = {
  deepen: boolean; // stay on this thread for one more question?
  deepenKind: "scene" | "feeling" | "thread";
  alsoCovered: string[]; // other themes this answer already told the real story of
  nextTheme: string | null; // the theme to move to next (chosen from the reachable set)
};

// The folded coverage for this turn, computed from the theme data by the caller (nextCoverage in
// spine.ts) — passed in so the engine stays a pure, import-free decision that loads under both the Next
// bundler and the node test runner.
export type Coverage = { covered: string[]; reachable: string[] };

export type Decision =
  | { action: "deepen"; kind: "scene" | "feeling" | "thread"; state: EngineState }
  | { action: "advance"; next: string; state: EngineState }
  | { action: "complete"; state: EngineState };

export const MAX_FOLLOWUPS = 2; // per theme
// Whole-interview budget for deepening. A genuinely alive thread can get two beats (per theme), but the
// total is capped so a uniformly intense interview winds down instead of becoming a marathon — once it's
// spent, every remaining theme gets a single question.
export const MAX_TOTAL_DEEPENS = 8;

export const START: EngineState = { current: "now", covered: [], followups: 0, deepens: 0 };

// Pure decision over the planner's read and the precomputed coverage. A thin answer earns scene/feeling
// digs and a charged answer a thread dig — up to two per theme and a bounded total — before we move on;
// otherwise we advance to the most-alive reachable theme, or complete once the whole arc is covered. A
// null plan (a skip, or a planner failure) simply advances, never deepens, so it can never trap or loop.
export function decideNext(state: EngineState, plan: Plan | null, coverage: Coverage): Decision {
  if (plan?.deepen && state.followups < MAX_FOLLOWUPS && state.deepens < MAX_TOTAL_DEEPENS) {
    return {
      action: "deepen",
      kind: plan.deepenKind,
      // Stay on `current` (still in flight, so kept out of covered), but still fold in any themes this
      // answer already told — otherwise a volunteered theme is dropped and gets re-asked later.
      state: {
        ...state,
        covered: coverage.covered.filter((k) => k !== state.current),
        followups: state.followups + 1,
        deepens: state.deepens + 1,
      },
    };
  }

  const { covered, reachable } = coverage;
  if (reachable.length === 0) {
    return { action: "complete", state: { ...state, covered, followups: 0 } };
  }

  const next = plan?.nextTheme && reachable.includes(plan.nextTheme) ? plan.nextTheme : reachable[0];
  return { action: "advance", next, state: { current: next, covered, followups: 0, deepens: state.deepens } };
}
