// The minimal shape the mapping reads (a superset is fine - getSynthesisStatus returns more).
export type SynthesisStatusRow = {
  status: string;
  bookKey: string | null;
  title: string | null;
  isStale: boolean;
};

export type SynthesisStatusResponse = {
  status: "ready" | "flagged" | "error" | "pending";
  url?: string;
  title?: string;
};

// Pure status -> client response mapping for the poll/idempotency endpoint. Allowlisted shape only
// (never the raw DB row). The route attaches the static SUPPORT_MESSAGE to the 'flagged' result - kept
// out of here so this stays dependency-free and trivially unit-testable. A null row (unknown session /
// persistence off / lookup hiccup) reads as pending so a transient blip never flips a healthy in-flight
// job to a terminal error.
export function mapSynthesisStatus(row: SynthesisStatusRow | null): SynthesisStatusResponse {
  if (!row) return { status: "pending" };
  switch (row.status) {
    case "synthesized":
      return row.bookKey
        ? { status: "ready", url: `/api/book/${row.bookKey}`, title: row.title ?? undefined }
        : { status: "error" }; // synthesized but no key = corrupt; surface as retryable
    case "flagged":
      return { status: "flagged" }; // the route adds the static SUPPORT_MESSAGE
    case "failed":
      return { status: "error" };
    case "synthesizing":
      // An invocation can't outlive maxDuration; a synthesizing row past STALENESS is provably orphaned.
      return { status: row.isStale ? "error" : "pending" };
    default: // in_progress / completed - claimed but the job hasn't written yet, or never claimed
      return { status: "pending" };
  }
}
