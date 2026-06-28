import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildSynthesisPrompt, type SynthesisInput } from "./prompt";
import { parseBook, type Book } from "./parse";
import { runQualityCheck } from "@/lib/quality/check";
import { repairBook } from "./repair";
import type { Gender } from "@/lib/gender";

// What surface the judge is scoring — shared by the gate and the post-repair re-judge so both apply
// the gender rule the same way. A neutral book reveals no gender on purpose, so the judge must be told
// not to flag that absence as an error (otherwise a false gender-agreement flag drives the repair pass
// to conjugate the text back toward a gender, undoing the neutral request).
function qualityContext(gender: Gender): string {
  if (gender === "neutral") {
    return "a personal Hebrew keepsake book written in deliberately gender-neutral Hebrew - it reveals no gender on purpose, which is correct; do NOT flag the absence of gender agreement, and there should be no slash-gender forms";
  }
  return "a personal Hebrew keepsake book; the subject's gender is known, so there should be no slash-gender forms";
}

// Opus for the book - it's once per customer and the highest-stakes Hebrew we produce; it follows
// the long ban-list and avoids translationese better than Sonnet. Opus 4.8 rejects `temperature`.
const MODEL = anthropic("claude-opus-4-8");

const SYSTEM =
  "אתה כותב את הספר בעברית בלבד. התחל מיד בסמן [TITLE], בלי שום טקסט לפניו. הפק אך ורק את הספר עם הסמנים (markers) בדיוק כפי שהוגדר - בלי הקדמה, בלי הסברים, בלי מחשבות, בלי טקסט באנגלית.";

// Bounded so a stalled stream can't hang the request or starve the PDF/upload stages of the route's
// maxDuration. (The repair pass no longer regenerates the book; it patches only the flagged lines.)
const GENERATE_TIMEOUT_MS = 180_000;

// Stream server-side and await the full text. The book runs at maxOutputTokens 32000, well past the
// ~16K threshold where a non-streamed call risks a silent SDK HTTP timeout; awaiting result.text
// drives the stream to completion and surfaces model errors instead of hanging. Errors are logged by
// name/message only - never the raw error object, which can carry the prompt/response body (the
// person's stories) into logs.
async function generate(prompt: string, timeoutMs: number): Promise<string> {
  const result = streamText({
    model: MODEL,
    system: SYSTEM,
    prompt,
    maxOutputTokens: 32000,
    abortSignal: AbortSignal.timeout(timeoutMs),
    onError: ({ error }) =>
      console.error("synthesis stream error", error instanceof Error ? error.message : String(error)),
  });
  const text = await result.text;
  if (!text.trim()) throw new Error("synthesis produced empty output");
  return text;
}

export async function synthesizeBook(input: SynthesisInput): Promise<Book> {
  const raw = await generate(buildSynthesisPrompt(input), GENERATE_TIMEOUT_MS);
  const book = parseBook(raw); // the original must be a valid book before we consider polishing it

  // Quality gate: judge the Hebrew, and if it falls short run a fast TARGETED repair (patch only the
  // flagged lines, then re-judge and keep the better draft). Fail-open by design - the original book
  // is already valid, so any judge/repair hiccup keeps it, never discards it. (This differs from the
  // safety gate, which fails CLOSED - there the stakes run the other way.)
  const context = qualityContext(input.gender);
  const verdict = await runQualityCheck(raw, context);
  if (verdict.ok) return book;

  try {
    return await repairBook({ raw, original: book, verdict, context });
  } catch (error) {
    const kind = error instanceof Error ? error.name : "Unknown";
    console.error(`book repair pass failed (${kind}) - keeping the original book`);
    return book;
  }
}
