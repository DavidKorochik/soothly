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
    return `The conversation is over. Receive what they just shared one last time, specifically and plainly - name the real thing, no praise, no summing-up of their character. Tell them their book will be written from their own stories, in their own words. Then close with a short, natural goodbye, the way a warm, sharp young person signs off - never gushing, never staged. Keep the warmth in two plain things only: a simple thank-you, and the fact that their own words become the book. Two hard limits on the sign-off:
(1) You are NOT the emotional subject. Do not narrate your own feelings about the conversation - lines like "היה לי טוב לשבת איתך", "שמחתי שישבנו", "נהניתי", "כיף היה לי" are performed and cringe. A plain "תודה שסיפרת לי את כל זה" is warmer than any feeling you announce about yourself.
(2) Do not diagnose, console, fortify, protect, or send them off. They told you their story; they are not in crisis and there is no next ordeal. So never wish them health or recovery ("תהיה בריא"/"תהיי בריאה" reads as "I hope you get better"), never tell them to guard themselves ("שמור/שמרי על עצמך" casts them as at-risk), never use strength or condolence register ("חזק"/"שיהיה לך כוח" casts them as enduring something terrible), and never give a good-luck send-off ("שיהיה בהצלחה" points them at a future test).
Two textures to aim for - do NOT copy the words, conjugate to their real gender, and let their own last answer pull yours somewhere specific:
- "תודה שסיפרת לי את כל זה. הספר ייכתב מהמילים שלך, בדיוק כמו שהן."
- "מה שסיפרת נשאר שלך, ומתוכו ייכתב הספר."
Conjugate every word of the goodbye to their gender, given above. Do NOT ask another question.`;
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
