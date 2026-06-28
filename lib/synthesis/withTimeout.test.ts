import { test } from "node:test";
import assert from "node:assert/strict";
import { withTimeout } from "./withTimeout.ts";

test("resolves with the value when the promise settles before the timeout", async () => {
  const result = await withTimeout(Promise.resolve("ok"), 1000, "fast");
  assert.equal(result, "ok");
});

test("resolves a slow-but-in-time promise", async () => {
  const slow = new Promise<string>((r) => setTimeout(() => r("done"), 5));
  assert.equal(await withTimeout(slow, 1000, "slow"), "done");
});

test("rejects with a labeled error when the promise exceeds the timeout", async () => {
  await assert.rejects(
    () => withTimeout(new Promise<never>(() => {}), 10, "pdf render"),
    /pdf render timed out after 10ms/,
  );
});

test("a late rejection from the losing promise does not throw (race already settled)", async () => {
  // The promise rejects AFTER the timeout fires; withTimeout must not surface it as an unhandled rejection.
  const lateReject = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("late")), 30));
  await assert.rejects(() => withTimeout(lateReject, 5, "upload"), /upload timed out after 5ms/);
  // Give the late rejection time to fire; if it were unhandled the process would warn/crash.
  await new Promise((r) => setTimeout(r, 40));
});
