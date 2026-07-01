import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_DURATION_SECONDS, STALENESS_MINUTES, MAX_POLL_MS } from "./timing.ts";

// Guards the safety-critical ordering. If anyone bumps one number without the others, CI fails here
// instead of a live job being reclaimed mid-flight (double billing) or the client giving up too early.
test("staleness window is strictly above the job's hard cap (no live job is ever reclaimed)", () => {
  assert.ok(
    STALENESS_MINUTES * 60 > MAX_DURATION_SECONDS,
    `STALENESS (${STALENESS_MINUTES * 60}s) must exceed MAX_DURATION_SECONDS (${MAX_DURATION_SECONDS}s)`,
  );
});

test("client poll ceiling outlasts the staleness window (it observes the error flip)", () => {
  assert.ok(
    MAX_POLL_MS > STALENESS_MINUTES * 60 * 1000,
    `MAX_POLL_MS (${MAX_POLL_MS}ms) must exceed STALENESS (${STALENESS_MINUTES * 60 * 1000}ms)`,
  );
});
