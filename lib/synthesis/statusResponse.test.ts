import { test } from "node:test";
import assert from "node:assert/strict";
import { mapSynthesisStatus } from "./statusResponse.ts";

const row = (over: Partial<Parameters<typeof mapSynthesisStatus>[0] & object> = {}) => ({
  status: "in_progress",
  bookKey: null,
  title: null,
  isStale: false,
  ...over,
});

test("null row (unknown / persistence off / blip) reads as pending", () => {
  assert.deepEqual(mapSynthesisStatus(null), { status: "pending" });
});

test("synthesized with a key maps to ready with the book url and title", () => {
  assert.deepEqual(mapSynthesisStatus(row({ status: "synthesized", bookKey: "abc.pdf", title: "הספר של דנה" })), {
    status: "ready",
    url: "/api/book/abc.pdf",
    title: "הספר של דנה",
  });
});

test("synthesized with no key is corrupt and surfaces as a retryable error", () => {
  assert.deepEqual(mapSynthesisStatus(row({ status: "synthesized", bookKey: null })), { status: "error" });
});

test("flagged maps to the flagged status (the route attaches the static support message)", () => {
  assert.deepEqual(mapSynthesisStatus(row({ status: "flagged" })), { status: "flagged" });
});

test("failed maps to error", () => {
  assert.deepEqual(mapSynthesisStatus(row({ status: "failed" })), { status: "error" });
});

test("synthesizing maps to pending while fresh and error once stale", () => {
  assert.deepEqual(mapSynthesisStatus(row({ status: "synthesizing", isStale: false })), { status: "pending" });
  assert.deepEqual(mapSynthesisStatus(row({ status: "synthesizing", isStale: true })), { status: "error" });
});

test("in_progress / completed (claimed-but-unwritten, or never claimed) map to pending", () => {
  assert.deepEqual(mapSynthesisStatus(row({ status: "in_progress" })), { status: "pending" });
  assert.deepEqual(mapSynthesisStatus(row({ status: "completed" })), { status: "pending" });
});
