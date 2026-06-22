import { test } from "node:test";
import assert from "node:assert/strict";
import { decideNext, START, MAX_FOLLOWUPS, MAX_TOTAL_DEEPENS, type EngineState, type Plan } from "./engine.ts";
import { THEMES, TOTAL_THEMES, reachableThemes, themeByKey, nextCoverage } from "./spine.ts";

const advance: Plan = { deepen: false, deepenKind: "thread", alsoCovered: [], nextTheme: null };
const deepenThread: Plan = { ...advance, deepen: true, deepenKind: "thread" };
const st = (over: Partial<EngineState> = {}): EngineState => ({ current: "now", covered: [], followups: 0, deepens: 0, ...over });

// Mirror the route: fold coverage from the theme data, then decide.
const decide = (state: EngineState, plan: Plan | null) =>
  decideNext(state, plan, nextCoverage(state.covered, state.current, plan?.alsoCovered ?? []));

test("START asks 'now' first, with nothing covered or deepened", () => {
  assert.deepEqual(START, { current: "now", covered: [], followups: 0, deepens: 0 });
});

test("a deepen plan stays on the current theme and counts the follow-up and the deepen", () => {
  const d = decide(st({ current: "hardship", covered: ["now", "why_now"] }), deepenThread);
  assert.equal(d.action, "deepen");
  assert.equal(d.action === "deepen" && d.kind, "thread");
  assert.equal(d.state.current, "hardship");
  assert.equal(d.state.followups, 1);
  assert.equal(d.state.deepens, 1);
});

test("a deepen still folds in volunteered themes (keeping current in flight) so they aren't re-asked", () => {
  const d = decide(st({ current: "hardship", covered: ["now", "why_now"] }), { ...deepenThread, alsoCovered: ["failure"] });
  assert.equal(d.action, "deepen");
  assert.ok(d.state.covered.includes("failure"), "the volunteered theme is recorded as covered");
  assert.ok(!d.state.covered.includes("hardship"), "the deepened theme stays in flight, not covered");
  // Walk forward to the end: 'failure' was told, so it must never be asked again.
  let state = d.state;
  const asked = new Set<string>([state.current]);
  for (let i = 0; i < TOTAL_THEMES + 5; i++) {
    const next = decide(state, advance);
    if (next.action === "complete") break;
    if (next.action === "advance") asked.add(next.next);
    state = next.state;
  }
  assert.ok(!asked.has("failure"), "a theme volunteered during a deepen is not re-asked");
});

test("deepening stops after MAX_FOLLOWUPS on one theme even if the plan still wants to", () => {
  const d = decide(st({ current: "hardship", followups: MAX_FOLLOWUPS }), deepenThread);
  assert.equal(d.action, "advance");
});

test("deepening stops once the whole-interview budget is spent", () => {
  const d = decide(st({ current: "hardship", followups: 0, deepens: MAX_TOTAL_DEEPENS }), deepenThread);
  assert.equal(d.action, "advance");
});

test("a thin scene/feeling dig is just a deepen with that kind, and may fire twice on a theme", () => {
  const first = decide(st({ current: "turning" }), { ...advance, deepen: true, deepenKind: "scene" });
  assert.equal(first.action === "deepen" && first.kind, "scene");
  const second = decide(st({ current: "turning", followups: 1, deepens: 1 }), { ...advance, deepen: true, deepenKind: "feeling" });
  assert.equal(second.action, "deepen");
});

test("advancing folds the current theme into covered, carries the deepen budget, and resets followups", () => {
  const d = decide(st({ current: "now", deepens: 3 }), { ...advance, nextTheme: "why_now" });
  assert.equal(d.action, "advance");
  assert.equal(d.action === "advance" && d.next, "why_now");
  assert.ok(d.state.covered.includes("now"));
  assert.equal(d.state.current, "why_now");
  assert.equal(d.state.followups, 0);
  assert.equal(d.state.deepens, 3);
});

test("an unreachable nextTheme is ignored and the first reachable theme is used instead", () => {
  const d = decide(st({ current: "now" }), { ...advance, nextTheme: "fear" });
  assert.equal(d.action, "advance");
  const reachable = reachableThemes(["now"]).map((t) => t.key);
  assert.ok(d.action === "advance" && reachable.includes(d.next));
  assert.ok(d.action === "advance" && d.next !== "fear");
});

test("nextCoverage drops garbage keys so covered only ever holds real themes", () => {
  const cov = nextCoverage(["now"], "why_now", ["decision", "not_a_theme", "also_fake"]);
  assert.ok(cov.covered.includes("decision"));
  assert.ok(cov.covered.every((k) => themeByKey(k) !== undefined), "covered holds only real theme keys");
  assert.ok(!cov.reachable.includes("now") && !cov.reachable.includes("why_now"), "covered themes aren't reachable");
});

test("alsoCovered skips themes the answer already told (cross-chapter)", () => {
  const d = decide(st({ current: "now" }), { ...advance, alsoCovered: ["decision"] });
  assert.ok(d.state.covered.includes("decision"));
  let state = d.state;
  const asked = new Set<string>([state.current]);
  for (let i = 0; i < TOTAL_THEMES + 5; i++) {
    const next = decide(state, advance);
    if (next.action === "complete") break;
    if (next.action === "advance") asked.add(next.next);
    state = next.state;
  }
  assert.ok(!asked.has("decision"), "decision was volunteered and must be skipped");
});

test("the arc is respected: tender themes are unreachable until their chapter", () => {
  assert.deepEqual(
    reachableThemes([]).map((t) => t.key),
    ["now", "why_now"],
  );
  const throughCh2 = THEMES.filter((t) => t.chapter <= 2).map((t) => t.key);
  assert.deepEqual(
    reachableThemes(throughCh2).map((t) => t.key),
    ["people", "pattern", "fear", "shadow"],
  );
});

test("a full run with deep answers terminates and asks every theme exactly once", () => {
  let state = START;
  const asked: string[] = [state.current];
  let steps = 0;
  for (;;) {
    if (steps++ > TOTAL_THEMES * (MAX_FOLLOWUPS + 2)) throw new Error("interview did not terminate");
    const d = decide(state, advance);
    if (d.action === "complete") break;
    if (d.action === "advance") asked.push(d.next);
    state = d.state;
  }
  assert.equal(asked.length, TOTAL_THEMES, "asks each theme once");
  assert.equal(new Set(asked).size, TOTAL_THEMES, "no theme asked twice");
  assert.deepEqual([...asked].sort(), THEMES.map((t) => t.key).sort(), "covers the whole arc");
});

test("even a relentlessly-deep run terminates and never exceeds the deepen budget", () => {
  let state = START;
  let asked = 1;
  let deepens = 0;
  for (let steps = 0; ; steps++) {
    if (steps > 100) throw new Error("interview did not terminate");
    const d = decide(state, deepenThread); // every answer begs to deepen
    if (d.action === "complete") break;
    if (d.action === "advance") asked++;
    if (d.action === "deepen") deepens++;
    state = d.state;
  }
  assert.ok(deepens <= MAX_TOTAL_DEEPENS, `deepens (${deepens}) within budget`);
  assert.equal(asked, TOTAL_THEMES, "still covers every theme");
});

test("a null plan (skip / planner failure) still advances and never deepens", () => {
  const d = decide(st({ current: "roots", covered: ["now", "why_now"] }), null);
  assert.equal(d.action, "advance");
});

test("theme keys are unique", () => {
  const keys = THEMES.map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(themeByKey("now") && themeByKey("pride"));
});
