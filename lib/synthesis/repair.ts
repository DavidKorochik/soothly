import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { parseBook, type Book } from "./parse";
import { runQualityCheck } from "@/lib/quality/check";
import type { Violation, QualityVerdict } from "@/lib/quality/decide";
import { applyDirectFixes, replaceAllLiteral, markerSequence } from "./patch";

// Targeted quality repair: instead of regenerating the whole 32K-token book (slow, often timed out),
// patch only the lines the judge flagged. Tier 1 applies the judge's own quote->suggestion edits with
// zero model latency; Tier 2 hands the leftovers to Sonnet for a small, bounded edit list. Then we
// re-judge and keep whichever draft scores higher, so a patch can never ship something worse than the
// original. Fail-open throughout: any error keeps the already-valid original book.

type FlaggedVerdict = Extract<QualityVerdict, { ok: false }>;

// Fast model for the bounded patch — the output is a short edit list, not a full rewrite, so Sonnet's
// speed wins and its Hebrew is more than enough to apply a phrase fix the judge already specified.
const PATCH_MODEL = anthropic("claude-sonnet-4-6");
const PATCH_TIMEOUT_MS = 25_000;

const EditsSchema = z.object({
  edits: z.array(
    z.object({
      find: z.string().min(1), // EXACT text copied verbatim from the book, so it is found
      replace: z.string(),
    }),
  ),
});

// The judge keeps low-severity nits out of the repair brief; mirror that here so the patch stays
// focused on what a reader would actually wince at.
const actionable = (violations: Violation[]): Violation[] =>
  violations.filter((v) => v.severity !== "low");

async function applyModelPatch(text: string, unresolved: Violation[]): Promise<string> {
  const issues = unresolved.map((v) => `- ${v.rule}: "${v.quote}" -> ${v.suggestion}`).join("\n");
  const { object } = await generateObject({
    model: PATCH_MODEL,
    schema: EditsSchema,
    system:
      "אתה משפר את העברית של ספר גמור. תקבל את הספר ורשימת בעיות ניסוח. החזר רשימת עריכות מינימליות: " +
      "`find` חייב להיות טקסט שהעתקת מילה-במילה מהספר (כדי שיימצא בדיוק), ו-`replace` הוא העברית המשופרת. " +
      "שנה רק את הניסוח שסומן - אל תיגע בתוכן, בעובדות, במבנה או בסמנים כמו [TITLE]. עברית טבעית, חמה ומדויקת.",
    prompt: `הבעיות לתיקון:\n${issues}\n\nהספר:\n${text}`,
    temperature: 0,
    maxOutputTokens: 2000,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(PATCH_TIMEOUT_MS),
  });
  let out = text;
  for (const e of object.edits) {
    if (e.find.trim() && out.includes(e.find)) out = replaceAllLiteral(out, e.find, e.replace);
  }
  return out;
}

export async function repairBook(args: {
  raw: string;
  original: Book;
  verdict: FlaggedVerdict;
  context: string;
}): Promise<Book> {
  const { raw, original, verdict, context } = args;
  const flagged = actionable(verdict.violations);
  if (flagged.length === 0) return original;

  const { patched, unresolved } = applyDirectFixes(raw, flagged);

  let result = patched;
  if (unresolved.length > 0) {
    try {
      result = await applyModelPatch(patched, unresolved);
    } catch (error) {
      const kind = error instanceof Error ? error.name : "Unknown";
      console.error(`targeted repair model patch failed (${kind}) - keeping the direct-fix patch`);
      result = patched; // a Tier-2 hiccup must not discard the Tier-1 improvements
    }
  }

  if (result === raw) return original; // nothing matched; no point re-judging

  // A patch must never change the book's [MARKER] structure: a stray bracketed token in a model
  // replacement would let parseBook silently mis-split chapters and ship a broken book that neither
  // parseBook (it wouldn't throw) nor the Hebrew-only re-judge would catch. If the marker sequence
  // changed, the patch corrupted the structure - keep the original valid book.
  if (markerSequence(result) !== markerSequence(raw)) {
    console.error("targeted repair altered the book's marker structure - keeping the original book");
    return original;
  }
  const repairedBook = parseBook(result); // the patch must still parse into a valid book

  // Keep the repaired draft only if it is at least as good: it now passes the gate (or the re-judge
  // failed open to score 0 -> ok:true, which we trust since the patch only applied judge-requested
  // fixes), or it scores no lower AND introduces no new high-severity violation the original lacked.
  const reverdict = await runQualityCheck(result, context);
  if (reverdict.ok) return repairedBook;
  const addsHighSeverity =
    reverdict.violations.some((v) => v.severity === "high") &&
    !verdict.violations.some((v) => v.severity === "high");
  if (reverdict.score >= verdict.score && !addsHighSeverity) return repairedBook;
  return original;
}
