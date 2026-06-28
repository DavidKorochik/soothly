import { test } from "node:test";
import assert from "node:assert/strict";
import { THEMES } from "./spine.ts";

// The one assertion that would have caught the "AI didn't ask a question back" report: a theme phrased
// as a statement (no "?") lets the interviewer land a turn with no real question.
test("every spine question contains a real question mark", () => {
  for (const t of THEMES) {
    assert.ok(t.question.includes("?"), `theme ${t.key} has no question mark: ${t.question}`);
  }
});

test("spine questions use a plain hyphen only, never an em/en dash", () => {
  for (const t of THEMES) {
    assert.ok(!/[—–]/.test(t.question), `theme ${t.key} uses an em/en dash: ${t.question}`);
  }
});

// The repeat report came from `turning` and `change` reading as the same "biggest change" question.
// `change` is fenced to slow/gradual change with no single moment, so it can't collapse into `turning`.
test("the transformation cluster is differentiated, not three asks for 'the big change'", () => {
  const byKey = Object.fromEntries(THEMES.map((t) => [t.key, t.question]));
  assert.match(byKey.change, /לאט|בלי רגע/, "change must signal slow/no-single-moment to avoid colliding with turning");
  assert.notEqual(byKey.turning, byKey.change);
});
