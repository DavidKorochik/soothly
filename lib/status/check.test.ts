import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveHealth } from "./health.ts";
import { ANTHROPIC_COMPONENT_MATCHERS, OPENAI_COMPONENT_MATCHERS } from "./constants.ts";

test("all matched components operational reads as operational", () => {
  const { health, matchedCount } = deriveHealth(
    [{ name: "Claude API (api.anthropic.com)", status: "operational" }],
    ANTHROPIC_COMPONENT_MATCHERS,
  );
  assert.equal(health, "operational");
  assert.equal(matchedCount, 1);
});

test("degraded_performance maps to degraded", () => {
  const { health } = deriveHealth(
    [{ name: "Claude API (api.anthropic.com)", status: "degraded_performance" }],
    ANTHROPIC_COMPONENT_MATCHERS,
  );
  assert.equal(health, "degraded");
});

test("takes the worst across matched components", () => {
  const { health } = deriveHealth(
    [
      { name: "Claude API (api.anthropic.com)", status: "degraded_performance" },
      { name: "api.anthropic.com edge", status: "major_outage" },
    ],
    ANTHROPIC_COMPONENT_MATCHERS,
  );
  assert.equal(health, "down");
});

test("matcher is case-insensitive and ignores unrelated components", () => {
  const { health, matchedCount } = deriveHealth(
    [
      { name: "claude.ai", status: "major_outage" },
      { name: "AUDIO", status: "degraded_performance" },
    ],
    OPENAI_COMPONENT_MATCHERS,
  );
  assert.equal(matchedCount, 1); // only "AUDIO" matches the OpenAI matcher
  assert.equal(health, "degraded");
});

test("unknown status string reads as operational, never throws", () => {
  const { health } = deriveHealth(
    [{ name: "Audio", status: "some_future_status" }],
    OPENAI_COMPONENT_MATCHERS,
  );
  assert.equal(health, "operational");
});

test("a renamed/missing component reports operational with matchedCount 0 (blind-monitor signal)", () => {
  const { health, matchedCount } = deriveHealth(
    [{ name: "Renamed Component", status: "major_outage" }],
    ANTHROPIC_COMPONENT_MATCHERS,
  );
  assert.equal(health, "operational");
  assert.equal(matchedCount, 0);
});
