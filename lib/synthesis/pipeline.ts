import { runSafetyCheck } from "@/lib/safety/check";
import { synthesizeBook } from "./synthesize";
import { renderPdf } from "@/lib/pdf/render";
import { storePdf } from "@/lib/storage/blob";
import { withTimeout } from "./withTimeout";
import type { SynthesisInput } from "./prompt";

export type BookResult =
  | { status: "ok"; key: string; title: string; chapters: number }
  | { status: "flagged"; message: string };

// Bound the two otherwise-unbounded stages (every model stage already has its own AbortSignal). A hung
// Chromium render or blob upload must not silently eat the whole maxDuration and orphan a 'synthesizing'
// row - withTimeout throws instead, which the caller turns into a clean, retryable failure.
const PDF_TIMEOUT_MS = 60_000;
const UPLOAD_TIMEOUT_MS = 30_000;

// The book pipeline, shared by the interview and the internal test page: safety gate (fail-CLOSED) ->
// synthesis -> PDF -> private storage. Returns the stored key; the caller maps it to /api/book/<key>
// and persists the link wherever it belongs.
export async function generateBook(input: SynthesisInput): Promise<BookResult> {
  const safety = await runSafetyCheck(input.answers);
  if (!safety.proceed) return { status: "flagged", message: safety.message };

  const book = await synthesizeBook(input);
  const pdf = await withTimeout(renderPdf(book, input.name), PDF_TIMEOUT_MS, "pdf render");
  const key = await withTimeout(storePdf(pdf, `${crypto.randomUUID()}.pdf`), UPLOAD_TIMEOUT_MS, "blob upload");
  return { status: "ok", key, title: book.title, chapters: book.chapters.length };
}
