// Shared timing constants for the async book job. The ORDERING is load-bearing and guarded by
// timing.test.ts:
//
//   MAX_DURATION_SECONDS (the job's hard cap)
//     < STALENESS_MINUTES * 60 (a 'synthesizing' row older than this is provably an orphan - a job
//        can't outlive the cap - so reclaiming it can never double-bill a still-running generation)
//     < MAX_POLL_MS / 1000 (the client outlasts the staleness line, so it observes a killed job flip
//        to 'error' instead of timing out blind on a still-'pending' row)
//
// Drift one number without the others and a live job could be reclaimed mid-flight (double billing) or
// the client could give up before recovery is possible.
//
// MAX_DURATION_SECONDS mirrors the literal `export const maxDuration` in app/api/synthesize/route.ts -
// that one stays a literal because Next statically analyzes route-segment config (an imported const can
// silently fall back to the default cap). If you change the route's cap, change this too; the test then
// catches any now-broken ordering.
export const MAX_DURATION_SECONDS = 600;
export const STALENESS_MINUTES = 11;
export const MAX_POLL_MS = 13 * 60 * 1000;
