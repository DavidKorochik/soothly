import fs from "node:fs";
import path from "node:path";
import type { Decision } from "./engine";
import { themeByKey, OPENING_THEME } from "./spine";

let system: string | null = null;
const loadSystem = () =>
  (system ??= fs.readFileSync(path.join(process.cwd(), "docs", "interview_system_prompt.md"), "utf8"));

export function systemFor(gender: "male" | "female", name: string, directive: string): string {
  return `${loadSystem()}

NAME: ${name}
GENDER: ${gender} - conjugate every Hebrew word for this gender, consistently.

DIRECTIVE FOR THIS MESSAGE:
${directive}`;
}

export function openingDirective(): string {
  return `This is the very first message. Greet them warmly by name. In two short lines, set them at ease: there are no right answers, only they will read this, they can skip any question, and there is no rush. Then ask this first question, phrased naturally and gently: "${OPENING_THEME.question}"`;
}

export function directiveFor(decision: Decision): string {
  if (decision.action === "complete") {
    return `The conversation is over. Receive what they just shared one last time, warmly and specifically - no praise, no summing-up of their character. Tell them their book will be written from their own stories, in their own words, and say a warm, quiet goodbye. Do NOT ask another question.`;
  }
  if (decision.action === "deepen") {
    if (decision.kind === "scene") {
      return `Their last answer stayed abstract. Receive it without appraising it, then ask ONE gentle follow-up that pulls for a specific moment - where they were, who was there, what actually happened. Stay on the same thread; do not change subject.`;
    }
    if (decision.kind === "feeling") {
      return `They gave the facts but not the feeling. Receive it warmly, then ask ONE gentle follow-up about what they felt in that exact moment. Stay on the same thread; do not change subject.`;
    }
    return `Their answer opened something that is clearly alive and present for them. Do not move on yet. Receive it, then ask ONE genuine question that goes deeper into exactly what they just shared - the same thread, not a new topic. No verdict, no advice, no praise.`;
  }
  const next = themeByKey(decision.next)!;
  return `First receive what they just said - react to the specific thing in their words with real curiosity, never a verdict or praise. Then ask THIS question, and only this one, phrased naturally and conjugated correctly: "${next.question}". Do not replace it with a question of your own. Bridge into it so it grows out of what they just told you: find the honest thread between their words and this question, and let that thread carry the move - but the question you land on must be this one. If there is truly no thread, keep it simple, but never announce that you are changing subject or going back. Ask one thing only, and pull for a concrete moment or scene, not an abstraction.`;
}
