import fs from "node:fs";
import path from "node:path";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { Plan } from "./engine";
import type { Theme } from "./spine";

// The planner reads one answer and decides how the interview should flow next. It is the responsive
// brain: depth (as the old evaluator scored), which other themes this answer already told, whether to
// stay one beat longer on a charged thread, and which of the allowed themes is most alive to ask next.
export type TurnPlan = Plan & { depth: number; hasScene: boolean; hasFeeling: boolean };

const PlanSchema = z.object({
  depth: z.number().int().min(1).max(5),
  has_scene: z.boolean(),
  has_feeling: z.boolean(),
  also_told: z.array(z.string()),
  worth_deepening: z.boolean(),
  next_theme: z.string().nullable(),
});

let prompt: string | null = null;
const loadPrompt = () =>
  (prompt ??= fs.readFileSync(path.join(process.cwd(), "docs", "interview_planner_prompt.md"), "utf8"));

const themeList = (themes: Theme[]) => themes.map((t) => `- ${t.key}: ${t.desc}`).join("\n");

const DEPTH_THRESHOLD = 3;

export async function planTurn(input: {
  theme: Theme; // the theme just answered
  answer: string;
  candidates: Theme[]; // themes we may move to next (arc-reachable and uncovered)
  remaining: Theme[]; // every still-uncovered theme (so the planner can flag what's already been told)
}): Promise<TurnPlan> {
  const { theme, answer, candidates, remaining } = input;
  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: PlanSchema,
      system: loadPrompt(),
      prompt: [
        `THEME JUST ASKED (${theme.key}): ${theme.desc}`,
        `QUESTION: ${theme.question}`,
        `ANSWER:\n${answer}`,
        ``,
        `STILL TO COVER — for "also_told", which of these (by key) did this answer ALREADY tell the real, specific story of, so that asking it would feel like you weren't listening? Be strict; a passing mention is not telling the story.`,
        themeList(remaining) || "- (none)",
        ``,
        `MAY ASK NEXT — pick "next_theme" from these keys only (the one that flows most naturally from what they just said). null if none fit.`,
        themeList(candidates) || "- (none)",
      ].join("\n"),
      temperature: 0,
      // Gates the next question — keep it from stalling the turn: cap output, retry once (not the SDK's
      // default twice), and bound it with a real abort. We use abortSignal rather than the SDK's `timeout`
      // option so the deadline surfaces as a thrown error and takes the fail-OPEN path below.
      maxOutputTokens: 300,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(9000),
    });

    const candidateKeys = new Set(candidates.map((t) => t.key));
    const remainingKeys = new Set(remaining.map((t) => t.key));
    const thin = object.depth < DEPTH_THRESHOLD;
    // The warm-up chapter stays light: deepen only to honor a charged, alive thread (the person
    // volunteering something real), never to interrogate a flat opener - early questions must feel
    // easy. Deeper themes also dig a thin answer for its missing scene/feeling, as before.
    const isWarmup = theme.chapter === 0;
    return {
      depth: object.depth,
      hasScene: object.has_scene,
      hasFeeling: object.has_feeling,
      deepen: isWarmup ? object.worth_deepening : thin || object.worth_deepening,
      deepenKind: !isWarmup && thin ? (object.has_scene ? "feeling" : "scene") : "thread",
      // A thin answer can't credibly have "told the real story" of another theme, so never let one skip a
      // theme — only a substantive answer (depth >= 3) is trusted to mark others already covered.
      alsoCovered: thin ? [] : object.also_told.filter((k) => remainingKeys.has(k)),
      nextTheme: object.next_theme && candidateKeys.has(object.next_theme) ? object.next_theme : null,
    };
  } catch (error) {
    // Fail OPEN: a planner hiccup (including a timeout) must never trap or loop the interview. Default to
    // a clean advance — no deepen, no skips — and let the engine pick the next reachable theme. Name the
    // failure mode so a sustained degradation is visible, not silent.
    const kind = error instanceof Error ? error.name : "Unknown";
    console.error(`interview planner failed (${kind}) - advancing fail-open`, error);
    return { depth: 5, hasScene: true, hasFeeling: true, deepen: false, deepenKind: "thread", alsoCovered: [], nextTheme: null };
  }
}
