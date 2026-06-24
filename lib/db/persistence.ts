// Persistence guards, kept dependency-free (no schema/drizzle import) so they're unit-testable in isolation.

// Persistence is fail-OPEN in local dev (the interview runs end-to-end without a DB) but fail-CLOSED in
// production: a missing DATABASE_URL on Vercel must crash loudly rather than silently discard a user's
// answers. Mirrors the Vercel guard in lib/storage/blob.ts.
export function persistenceEnabled(): boolean {
  if (process.env.DATABASE_URL) return true;
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is missing in a Vercel deployment; refusing to run the interview without persistence.");
  }
  return false;
}

// neon-http is non-pooled HTTP with no transactions, so one transient failure (cold start, blip, Neon
// 5xx) would otherwise lose an irreplaceable write. Retry the few writes that carry user data.
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts - 1) await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
  }
  throw lastErr;
}
