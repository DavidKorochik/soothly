import { test } from "node:test";
import assert from "node:assert/strict";
import { ACCEPTED_MIME, mimeBase, normalizeTranscript } from "./constants.ts";
import { TranscriptionError } from "./errors.ts";

test("mimeBase strips the codec parameter and lowercases", () => {
  assert.equal(mimeBase("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(mimeBase("AUDIO/MP4"), "audio/mp4");
});

test("the allow-list accepts the browser containers and rejects others", () => {
  assert.ok(ACCEPTED_MIME.has(mimeBase("audio/webm;codecs=opus"))); // Chrome/Firefox/Safari 18.4+
  assert.ok(ACCEPTED_MIME.has(mimeBase("audio/mp4"))); // iOS Safari (AAC)
  assert.ok(!ACCEPTED_MIME.has(mimeBase("audio/flac")));
  assert.ok(!ACCEPTED_MIME.has(mimeBase("video/mp4")));
});

test("normalizeTranscript collapses runs of spaces/tabs and trims", () => {
  assert.equal(normalizeTranscript("  שלום   עולם \t טקסט  "), "שלום עולם טקסט");
});

test("normalizeTranscript reduces a whitespace-only string to empty", () => {
  assert.equal(normalizeTranscript("   \n  "), "");
});

test("TranscriptionError carries an HTTP status and a Hebrew message per code", () => {
  const tooLarge = new TranscriptionError("too_large");
  assert.equal(tooLarge.status, 413);
  assert.match(tooLarge.userMessage, /[֐-׿]/);

  assert.equal(new TranscriptionError("unsupported_format").status, 415);
  assert.equal(new TranscriptionError("empty_audio").status, 422);
  assert.equal(new TranscriptionError("provider_failed").status, 502);
  assert.equal(new TranscriptionError("no_provider_key").status, 503);
});
