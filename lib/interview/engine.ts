export type Phase = 1 | 2;
export type EngineState = { phase: Phase; index: number; followups: number };
export type AnswerEval = { depth: number; hasScene: boolean; hasFeeling: boolean };

// How many questions each phase holds — passed in so the engine stays a pure, import-free decision.
export type Bounds = { phase1: number; phase2: number };

export type Decision =
  | { action: "advance"; state: EngineState }
  | { action: "followup"; missing: "scene" | "feeling"; state: EngineState }
  | { action: "complete"; state: EngineState };

export const START: EngineState = { phase: 1, index: 0, followups: 0 };

const MAX_FOLLOWUPS = 2;
const DEPTH_THRESHOLD = 3;

// Phase 1 is light warm-up (never evaluated). Phase 2 digs for a real story: a thin answer earns
// up to two follow-ups before we move on, so we never trap someone yet never settle for an abstraction.
export function decideNext(state: EngineState, evaluation: AnswerEval | null, bounds: Bounds): Decision {
  if (
    state.phase === 2 &&
    evaluation &&
    evaluation.depth < DEPTH_THRESHOLD &&
    state.followups < MAX_FOLLOWUPS
  ) {
    return {
      action: "followup",
      missing: evaluation.hasScene ? "feeling" : "scene",
      state: { ...state, followups: state.followups + 1 },
    };
  }

  if (state.phase === 1) {
    return state.index + 1 < bounds.phase1
      ? { action: "advance", state: { phase: 1, index: state.index + 1, followups: 0 } }
      : { action: "advance", state: { phase: 2, index: 0, followups: 0 } };
  }

  return state.index + 1 < bounds.phase2
    ? { action: "advance", state: { phase: 2, index: state.index + 1, followups: 0 } }
    : { action: "complete", state };
}
