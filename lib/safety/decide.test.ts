import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, type Classification } from "./decide.ts";

const cases: { name: string; c: Classification; proceed: boolean }[] = [
  { name: "clean answers", c: { crisis: false, severity: "none", signals: [], rationale: "" }, proceed: true },
  { name: "reflective past pain (low)", c: { crisis: false, severity: "low", signals: [], rationale: "" }, proceed: true },
  { name: "heavy past hardship (moderate, no current risk)", c: { crisis: false, severity: "moderate", signals: [], rationale: "" }, proceed: true },
  { name: "current crisis", c: { crisis: true, severity: "moderate", signals: ["x"], rationale: "" }, proceed: false },
  { name: "high severity overrides", c: { crisis: false, severity: "high", signals: [], rationale: "" }, proceed: false },
];

for (const tc of cases) {
  test(`decide: ${tc.name} -> proceed=${tc.proceed}`, () => {
    const d = decide(tc.c);
    assert.equal(d.proceed, tc.proceed);
    if (!d.proceed) assert.ok(d.message.length > 0);
  });
}
