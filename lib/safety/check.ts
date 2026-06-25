import fs from "node:fs";
import path from "node:path";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { decide, type SafetyDecision } from "./decide";

const ClassificationSchema = z.object({
  crisis: z.boolean(),
  severity: z.enum(["none", "low", "moderate", "high"]),
  signals: z.array(z.string()),
  rationale: z.string(),
});

let prompt: string | null = null;
function loadPrompt(): string {
  return (prompt ??= fs.readFileSync(
    path.join(process.cwd(), "docs", "safety_check_prompt.md"),
    "utf8",
  ));
}

export async function runSafetyCheck(answers: string): Promise<SafetyDecision> {
  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: ClassificationSchema,
      system: loadPrompt(),
      prompt: answers,
      temperature: 0,
      // generateObject ignores `timeout`, so bound the only unbounded model call in the pipeline via
      // abortSignal — a hung classifier must not silently eat the synthesize route's 300s budget. On
      // timeout this throws and we fail CLOSED below, exactly as for any other classifier failure.
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(20000),
    });
    return decide(object);
  } catch (error) {
    // Fail closed: if the classifier is unavailable, never auto-generate on unscreened input.
    console.error("safety check failed — failing closed", error);
    return decide({ crisis: true, severity: "high", signals: ["safety-check-error"], rationale: "classifier unavailable" });
  }
}
