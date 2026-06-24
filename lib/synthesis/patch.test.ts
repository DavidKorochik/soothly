import { test } from "node:test";
import assert from "node:assert/strict";
import { replaceAllLiteral, applyDirectFixes, markerSequence } from "./patch.ts";
import type { Violation } from "../quality/decide.ts";

const v = (quote: string, suggestion: string, severity: Violation["severity"] = "high"): Violation => ({
  rule: "translationese",
  severity,
  quote,
  suggestion,
});

test("replaceAllLiteral replaces every occurrence literally", () => {
  assert.equal(replaceAllLiteral("a X b X c", "X", "Y"), "a Y b Y c");
});

test("replaceAllLiteral treats $-sequences in the replacement as literal text", () => {
  // The replacement carries a literal `$&` / `$\`` which String.prototype.replace would mis-expand.
  assert.equal(replaceAllLiteral("price PH here", "PH", "$& and $`"), "price $& and $` here");
});

test("replaceAllLiteral matches regex-special characters in `find` literally", () => {
  assert.equal(replaceAllLiteral("cost (a.b) end", "(a.b)", "X"), "cost X end");
});

test("replaceAllLiteral with an empty `find` returns the text unchanged", () => {
  assert.equal(replaceAllLiteral("unchanged", "", "Y"), "unchanged");
});

test("applyDirectFixes patches found quotes and leaves the rest unresolved", () => {
  const raw = "השארת אותי בלי מילים. זה היה מסע ארוך.";
  const violations = [
    v("בלי מילים", "חסר מילים"), // present -> applied
    v("לא קיים בכלל", "משהו"), // absent -> unresolved
  ];
  const { patched, unresolved } = applyDirectFixes(raw, violations);
  assert.equal(patched, "השארת אותי חסר מילים. זה היה מסע ארוך.");
  assert.equal(unresolved.length, 1);
  assert.equal(unresolved[0].quote, "לא קיים בכלל");
});

test("applyDirectFixes skips a violation with an empty suggestion (left unresolved)", () => {
  const raw = "טקסט עם ביטוי לתיקון בפנים.";
  const { patched, unresolved } = applyDirectFixes(raw, [v("ביטוי לתיקון", "   ")]);
  assert.equal(patched, raw);
  assert.equal(unresolved.length, 1);
});

test("applyDirectFixes never lets a $-bearing suggestion corrupt the book", () => {
  const raw = "עלה DOLLAR לחודש";
  const { patched } = applyDirectFixes(raw, [v("DOLLAR", "$100")]);
  assert.equal(patched, "עלה $100 לחודש");
});

test("markerSequence captures the ordered [MARKER] tokens", () => {
  const raw = "[TITLE]\nכותרת\n[OPENING]\nפתיחה\n[CH1_TITLE]\nפרק";
  assert.equal(markerSequence(raw), "[TITLE],[OPENING],[CH1_TITLE]");
});

test("markerSequence detects a marker a patch sneaks into the body (structural guard)", () => {
  const raw = "[CH1_BODY]\nמשפט אחד. משפט שני.";
  // A suggestion that injects a bracketed token would let parseBook mis-split the chapter; the guard
  // is the marker sequence changing.
  const { patched } = applyDirectFixes(raw, [v("משפט שני", "[CH2_TITLE] משפט שני")]);
  assert.notEqual(markerSequence(patched), markerSequence(raw));
});
