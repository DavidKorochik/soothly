// Bound a promise: reject with a labeled error if it doesn't settle within ms. Used to fence the
// otherwise-unbounded PDF render and blob upload so a hang surfaces as a clean, retryable failure
// instead of silently eating the whole maxDuration budget. The timer is cleared on settle so it can't
// keep a serverless invocation alive; a late rejection from the losing promise is swallowed so it can't
// surface as an unhandled rejection after the race already settled (Promise.race already observes it,
// but this is explicit and runtime-independent).
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
