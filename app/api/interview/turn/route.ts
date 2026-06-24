import { z } from "zod";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { planTurn, type TurnPlan } from "@/lib/interview/planner";
import { decideNext } from "@/lib/interview/engine";
import { themeByKey, reachableThemes, nextCoverage, THEMES, TOTAL_THEMES } from "@/lib/interview/spine";
import { systemFor, directiveFor } from "@/lib/interview/prompt";
import { saveTranscript, logFunnel, completeSession } from "@/lib/db/queries";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MsgSchema = z.object({ role: z.enum(["assistant", "user"]), content: z.string() });
const Schema = z.object({
  sessionId: z.string().uuid(),
  name: z.string(),
  gender: z.enum(["male", "female"]),
  messages: z.array(MsgSchema).min(1),
  engine: z.object({
    current: z.string(),
    covered: z.array(z.string()),
    followups: z.number().int().min(0),
    deepens: z.number().int().min(0),
  }),
  skip: z.boolean().optional(),
});

// Warm-up chapter rows are phase 1, everything deeper is phase 2 — preserving the transcript's
// existing 1=warmup / 2=deep convention now that the engine no longer tracks phase directly.
const phaseFor = (key: string) => ((themeByKey(key)?.chapter ?? 0) === 0 ? 1 : 2);

export async function POST(req: Request) {
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch {
    return Response.json({ error: "משהו לא נראה תקין. אפשר לנסות שוב." }, { status: 400 });
  }

  const { sessionId, gender, name, messages, engine } = body;
  const theme = themeByKey(engine.current);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (!theme || !lastUser) return Response.json({ error: "משהו השתבש. אפשר לרענן ולהמשיך." }, { status: 400 });

  // Plan the turn: read the answer for depth, what it already told, whether to stay on this thread, and
  // which reachable theme is most alive next. A skip is never planned (null plan -> the engine advances).
  let plan: TurnPlan | null = null;
  if (body.skip) {
    await logFunnel({ sessionId, event: "question_skipped", phase: phaseFor(theme.key), questionKey: theme.key });
  } else {
    const covered = [...new Set([...engine.covered, engine.current])];
    const done = new Set(covered);
    const remaining = THEMES.filter((t) => !done.has(t.key));
    const candidates = reachableThemes(covered);
    plan = await planTurn({ theme, answer: lastUser.content, candidates, remaining });
  }

  await saveTranscript({
    sessionId,
    phase: phaseFor(theme.key),
    questionKey: theme.key,
    questionText: lastAssistant?.content ?? theme.question,
    answer: lastUser.content,
    meta: { plan, followupRound: engine.followups },
  });

  // Themes the answer already told, so the engine will skip them - logged so a production skip rate is
  // visible, not only buried in transcript meta.
  if (plan?.alsoCovered.length) {
    await logFunnel({ sessionId, event: "themes_volunteered", phase: phaseFor(theme.key), questionKey: theme.key, meta: { volunteered: plan.alsoCovered } });
  }

  const decision = decideNext(engine, plan, nextCoverage(engine.covered, engine.current, plan?.alsoCovered ?? []));

  if (decision.action === "advance") {
    await logFunnel({ sessionId, event: "question_reached", phase: phaseFor(decision.next), questionKey: decision.next });
  } else if (decision.action === "deepen") {
    await logFunnel({ sessionId, event: "followup_asked", phase: phaseFor(theme.key), questionKey: theme.key });
  } else {
    await logFunnel({ sessionId, event: "interview_completed", phase: 2 });
    await completeSession(sessionId);
  }

  let directive = directiveFor(decision);
  if (decision.action === "advance") {
    if (themeByKey(engine.current)?.chapter !== themeByKey(decision.next)?.chapter) {
      directive +=
        " This question opens a deeper part of the conversation - let your bridge from what they just said carry that shift. Do not announce a new section, and never frame it as 'moving on' or going 'back'.";
    }
    // The end is near once only a couple of themes remain to ask (the new current plus at most one more).
    if (TOTAL_THEMES - decision.state.covered.length <= 2) {
      directive += " The end is near - you may let them gently feel that we are almost done.";
    }
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemFor(gender, name, directive),
    messages,
    temperature: 0.7,
    // A turn is one short message; cap it so a runaway generation can't stall the reveal. A stalled
    // stream is caught by the client watchdog and surfaced as a retry - not bounded with the SDK's
    // chunkMs, which would close a mid-stream stall as a clean 200 and render a truncated question.
    maxOutputTokens: 400,
    onError: ({ error }) => console.error("[interview/turn] model stream failed", { sessionId, error }),
  });

  return result.toTextStreamResponse({
    headers: {
      "X-Engine": JSON.stringify(decision.state),
      "X-Done": decision.action === "complete" ? "1" : "0",
    },
  });
}
