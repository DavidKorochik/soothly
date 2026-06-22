import fs from "node:fs";
import path from "node:path";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { decide, QUALITY_RULES, type QualityVerdict } from "./decide";

const ReportSchema = z.object({
  score: z.number().int().min(1).max(5),
  violations: z.array(
    z.object({
      rule: z.enum(QUALITY_RULES),
      severity: z.enum(["high", "medium", "low"]),
      quote: z.string(),
      suggestion: z.string(),
    }),
  ),
  summary: z.string(),
});

let prompt: string | null = null;
function loadPrompt(): string {
  return (prompt ??= fs.readFileSync(
    path.join(process.cwd(), "docs", "hebrew_quality_prompt.md"),
    "utf8",
  ));
}

// Score a piece of Hebrew against the brand-voice rules. `context` tells the judge what surface this
// is (e.g. a book vs static UI copy) so it applies the gender rule correctly.
export async function runQualityCheck(text: string, context: string): Promise<QualityVerdict> {
  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: ReportSchema,
      system: loadPrompt(),
      prompt: `CONTEXT: ${context}\n\nTEXT TO JUDGE:\n${text}`,
      temperature: 0,
      // generateObject ignores the `timeout` option (only generateText/streamText honor it), so the
      // deadline MUST go through abortSignal; one retry, not the SDK default of two.
      maxOutputTokens: 4000,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(30000),
    });
    return decide(object);
  } catch (error) {
    // Fail OPEN: a judge hiccup must never discard an already-written book. The book proceeds
    // unpolished and the failure is logged by name (never the raw error, which can carry the book
    // text). score 0 is a sentinel for "unchecked" should a caller ever want to persist it.
    const kind = error instanceof Error ? error.name : "Unknown";
    console.error(`hebrew quality check failed (${kind}) - passing unchecked`);
    return { ok: true, score: 0 };
  }
}
