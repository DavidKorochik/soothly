import { test } from "node:test";
import assert from "node:assert/strict";
import { decideNext, START, type AnswerEval } from "./engine.ts";
import { PHASE1, PHASE2 } from "./spine.ts";

const B = { phase1: PHASE1.length, phase2: PHASE2.length };
const deep: AnswerEval = { depth: 5, hasScene: true, hasFeeling: true };
const thinNoScene: AnswerEval = { depth: 2, hasScene: false, hasFeeling: false };
const thinNoFeeling: AnswerEval = { depth: 2, hasScene: true, hasFeeling: false };

test("phase 1 never follows up, just advances", () => {
  const d = decideNext(START, null, B);
  assert.equal(d.action, "advance");
  assert.deepEqual(d.state, { phase: 1, index: 1, followups: 0 });
});

test("last phase-1 question advances into phase 2", () => {
  const d = decideNext({ phase: 1, index: PHASE1.length - 1, followups: 0 }, null, B);
  assert.equal(d.action, "advance");
  assert.deepEqual(d.state, { phase: 2, index: 0, followups: 0 });
});

test("thin phase-2 answer without a scene asks for the scene", () => {
  const d = decideNext({ phase: 2, index: 0, followups: 0 }, thinNoScene, B);
  assert.equal(d.action, "followup");
  assert.equal(d.action === "followup" && d.missing, "scene");
  assert.equal(d.state.followups, 1);
});

test("thin phase-2 answer with a scene but no feeling asks for the feeling", () => {
  const d = decideNext({ phase: 2, index: 0, followups: 0 }, thinNoFeeling, B);
  assert.equal(d.action === "followup" && d.missing, "feeling");
});

test("after two follow-ups it advances even if still thin", () => {
  const d = decideNext({ phase: 2, index: 0, followups: 2 }, thinNoScene, B);
  assert.equal(d.action, "advance");
  assert.deepEqual(d.state, { phase: 2, index: 1, followups: 0 });
});

test("a deep phase-2 answer advances immediately", () => {
  const d = decideNext({ phase: 2, index: 3, followups: 0 }, deep, B);
  assert.equal(d.action, "advance");
  assert.equal(d.state.index, 4);
});

test("the last phase-2 question completes the interview", () => {
  const d = decideNext({ phase: 2, index: PHASE2.length - 1, followups: 0 }, deep, B);
  assert.equal(d.action, "complete");
});

test("spine keys are unique", () => {
  const keys = [...PHASE1, ...PHASE2].map((q) => q.key);
  assert.equal(new Set(keys).size, keys.length);
});
