import { test } from "node:test";
import assert from "node:assert/strict";
import { GENDERS, genderDirective, type Gender } from "./gender.ts";

test("GENDERS lists exactly male, female, neutral", () => {
  assert.deepEqual([...GENDERS], ["male", "female", "neutral"]);
});

test("male and female directives name their conjugation and never neutral", () => {
  const male = genderDirective("male");
  const female = genderDirective("female");
  assert.match(male, /MASCULINE/);
  assert.match(female, /FEMININE/);
  assert.doesNotMatch(male, /NEUTRAL/);
  assert.doesNotMatch(female, /NEUTRAL/);
});

test("neutral directive forbids guessing a gender and bans slash/inner-dot forms", () => {
  const neutral = genderDirective("neutral");
  assert.match(neutral, /NEUTRAL/);
  assert.match(neutral, /never assume or guess/i);
  // The neutral path must not silently fall back to a slash-form, which the brand voice bans.
  assert.match(neutral, /NEVER use slash-forms/);
});

test("every gender produces a non-empty, distinct directive", () => {
  const directives = GENDERS.map((g: Gender) => genderDirective(g));
  assert.equal(new Set(directives).size, GENDERS.length);
  for (const d of directives) assert.ok(d.trim().length > 0);
});
