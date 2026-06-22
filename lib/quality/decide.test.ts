import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, buildFeedback, type QualityReport, type Violation } from "./decide.ts";

const high: Violation = { rule: "translationese", severity: "high", quote: "בסופו של יום", suggestion: "בשורה התחתונה" };
const medium: Violation = { rule: "padding", severity: "medium", quote: "ממש ממש", suggestion: "חתוך" };
const low: Violation = { rule: "other", severity: "low", quote: "x", suggestion: "y" };

const cases: { name: string; report: QualityReport; ok: boolean }[] = [
  { name: "flawless", report: { score: 5, violations: [], summary: "" }, ok: true },
  { name: "solid native", report: { score: 4, violations: [], summary: "" }, ok: true },
  { name: "score 4 with only a medium nit passes", report: { score: 4, violations: [medium], summary: "" }, ok: true },
  { name: "a single high-severity wince fails even at score 4", report: { score: 4, violations: [high], summary: "" }, ok: false },
  { name: "high severity fails at a top score too", report: { score: 5, violations: [high], summary: "" }, ok: false },
  { name: "low score fails with no listed violations", report: { score: 3, violations: [], summary: "" }, ok: false },
  { name: "low score fails", report: { score: 2, violations: [medium], summary: "" }, ok: false },
];

for (const tc of cases) {
  test(`decide: ${tc.name} -> ok=${tc.ok}`, () => {
    const v = decide(tc.report);
    assert.equal(v.ok, tc.ok);
    if (!v.ok) {
      assert.equal(v.score, tc.report.score);
      assert.ok(v.feedback.length > 0);
    }
  });
}

test("feedback names the offending quote and its fix", () => {
  const fb = buildFeedback([high]);
  assert.ok(fb.includes("בסופו של יום"));
  assert.ok(fb.includes("בשורה התחתונה"));
});

test("feedback drops low-severity nits when real issues exist", () => {
  const fb = buildFeedback([high, low]);
  assert.ok(fb.includes("בסופו של יום"));
  assert.ok(!fb.includes('"x"'));
});

test("feedback falls back to a generic brief when nothing concrete is listed", () => {
  const fb = buildFeedback([]);
  assert.ok(fb.length > 0);
});
