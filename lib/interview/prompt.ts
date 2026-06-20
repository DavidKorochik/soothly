import fs from "node:fs";
import path from "node:path";
import type { Decision } from "./engine";
import { questionAt } from "./spine";

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
  const first = questionAt(1, 0)!;
  return `This is the very first message. Greet them warmly by name. In two short lines, set them at ease: there are no right answers, only they will read this, they can skip any question, and there is no rush. Then ask this first question, phrased naturally and gently: "${first.question}"`;
}

export function directiveFor(decision: Decision): string {
  if (decision.action === "complete") {
    return `The conversation is over. Thank them genuinely and warmly for what they shared, tell them their book will be written from their own stories, and say a warm goodbye. Do NOT ask another question.`;
  }
  if (decision.action === "followup") {
    return decision.missing === "scene"
      ? `Their last answer stayed abstract. Acknowledge it in one warm line, then ask ONE gentle follow-up that pulls for a specific moment - where they were, who was there, what actually happened.`
      : `They gave the facts but not the feeling. Acknowledge it warmly, then ask ONE gentle follow-up about what they felt in that exact moment.`;
  }
  const next = questionAt(decision.state.phase, decision.state.index)!;
  return `Acknowledge their last answer in one warm, specific sentence that shows you truly read it. Then move on and ask this, phrased naturally and conjugated correctly: "${next.question}" - always pulling for one concrete moment or scene, never an abstraction.`;
}
