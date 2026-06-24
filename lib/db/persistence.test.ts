import { test } from "node:test";
import assert from "node:assert/strict";
import { persistenceEnabled, withRetry } from "./persistence.ts";

function withEnv(env: { db?: string; vercel?: string }, fn: () => void) {
  const prev = { db: process.env.DATABASE_URL, vercel: process.env.VERCEL };
  set("DATABASE_URL", env.db);
  set("VERCEL", env.vercel);
  try {
    fn();
  } finally {
    set("DATABASE_URL", prev.db);
    set("VERCEL", prev.vercel);
  }
}

function set(key: string, value?: string) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("persistenceEnabled: true when DATABASE_URL is set", () => {
  withEnv({ db: "postgres://x" }, () => assert.equal(persistenceEnabled(), true));
});

test("persistenceEnabled: false in dev when DATABASE_URL is unset (fail-open)", () => {
  withEnv({}, () => assert.equal(persistenceEnabled(), false));
});

test("persistenceEnabled: throws on Vercel when DATABASE_URL is unset (fail-closed)", () => {
  withEnv({ vercel: "1" }, () => assert.throws(() => persistenceEnabled(), /DATABASE_URL is missing/));
});

test("withRetry: returns once the call succeeds after transient failures", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    if (calls < 3) throw new Error("transient");
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(calls, 3);
});

test("withRetry: throws the last error after exhausting attempts", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => {
      calls++;
      throw new Error("boom");
    }, 2),
    /boom/,
  );
  assert.equal(calls, 2);
});
