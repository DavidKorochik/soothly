import { runSafetyCheck } from "@/lib/safety/check";
import { synthesizeBook } from "./synthesize";
import { renderPdf } from "@/lib/pdf/render";
import { storePdf } from "@/lib/storage/blob";
import type { SynthesisInput } from "./prompt";

export type BookResult =
  | { status: "ok"; key: string; title: string; chapters: number }
  | { status: "flagged"; message: string };

// The book pipeline, shared by the interview and the internal test page: safety gate (fail-CLOSED) ->
// synthesis -> PDF -> private storage. Returns the stored key; the caller maps it to /api/book/<key>
// and persists the link wherever it belongs.
export async function generateBook(input: SynthesisInput): Promise<BookResult> {
  const safety = await runSafetyCheck(input.answers);
  if (!safety.proceed) return { status: "flagged", message: safety.message };

  const book = await synthesizeBook(input);
  const pdf = await renderPdf(book, input.name);
  const key = await storePdf(pdf, `${crypto.randomUUID()}.pdf`);
  return { status: "ok", key, title: book.title, chapters: book.chapters.length };
}
