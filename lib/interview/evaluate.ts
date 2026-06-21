import fs from "node:fs";
import path from "node:path";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { AnswerEval } from "./engine";

const EvalSchema = z.object({
  depth: z.number().int().min(1).max(5),
  has_scene: z.boolean(),
  has_feeling: z.boolean(),
});

let prompt: string | null = null;
const loadPrompt = () =>
  (prompt ??= fs.readFileSync(path.join(process.cwd(), "docs", "interview_eval_prompt.md"), "utf8"));

export async function evaluateAnswer(question: string, answer: string): Promise<AnswerEval> {
  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: EvalSchema,
      system: loadPrompt(),
      prompt: `שאלה: ${question}\n\nתשובה: ${answer}`,
      temperature: 0,
      // This call gates the next question - keep it from stalling the turn: cap output, retry once
      // (not the SDK's default of twice), and bound it with a real abort so a slow model can't hang
      // it. generateObject ignores the `timeout` option (only generateText/streamText honor it), so
      // a timeout MUST go through abortSignal; the abort surfaces as an error and fails OPEN below.
      maxOutputTokens: 200,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(8000),
    });
    return { depth: object.depth, hasScene: object.has_scene, hasFeeling: object.has_feeling };
  } catch (error) {
    // Fail OPEN: a scoring hiccup (including a timeout) must never trap someone in follow-ups - treat
    // as good and advance. Name the failure mode so a sustained degradation is visible, not silent.
    const kind = error instanceof Error ? error.name : "Unknown";
    console.error(`answer eval failed (${kind}) - advancing fail-open`, error);
    return { depth: 5, hasScene: true, hasFeeling: true };
  }
}
