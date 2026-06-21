import { z } from "zod";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { evaluateAnswer } from "@/lib/interview/evaluate";
import { decideNext, type EngineState } from "@/lib/interview/engine";
import { questionAt, PHASE1_LEN, PHASE2_LEN } from "@/lib/interview/spine";
import { systemFor, directiveFor } from "@/lib/interview/prompt";
import { chapterLabel } from "@/lib/interview/chapters";
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
    phase: z.union([z.literal(1), z.literal(2)]),
    index: z.number().int().min(0),
    followups: z.number().int().min(0),
  }),
  skip: z.boolean().optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch {
    return Response.json({ error: "קלט לא תקין" }, { status: 400 });
  }

  const { sessionId, gender, name, messages, engine } = body;
  const target = questionAt(engine.phase, engine.index);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (!target || !lastUser) return Response.json({ error: "מצב לא תקין" }, { status: 400 });

  // Phase 2 answers are scored for story depth; phase 1 is a light warm-up. A skip never evaluates
  // (null forces an advance, never a follow-up).
  const evaluation =
    engine.phase === 2 && !body.skip ? await evaluateAnswer(target.question, lastUser.content) : null;
  if (body.skip) await logFunnel({ sessionId, event: "question_skipped", phase: engine.phase, questionKey: target.key });

  await saveTranscript({
    sessionId,
    phase: engine.phase,
    questionKey: target.key,
    questionText: lastAssistant?.content ?? target.question,
    answer: lastUser.content,
    meta: { eval: evaluation, followupRound: engine.followups },
  });

  const decision = decideNext(engine as EngineState, evaluation, { phase1: PHASE1_LEN, phase2: PHASE2_LEN });

  if (decision.action === "advance") {
    const next = questionAt(decision.state.phase, decision.state.index)!;
    await logFunnel({ sessionId, event: "question_reached", phase: decision.state.phase, questionKey: next.key });
  } else if (decision.action === "followup") {
    await logFunnel({ sessionId, event: "followup_asked", phase: engine.phase, questionKey: target.key });
  } else {
    await logFunnel({ sessionId, event: "interview_completed", phase: 2 });
    await completeSession(sessionId);
  }

  let directive = directiveFor(decision);
  if (decision.action === "advance") {
    if (chapterLabel(engine.phase, engine.index) !== chapterLabel(decision.state.phase, decision.state.index)) {
      directive +=
        " The person just finished a part of the conversation - add one short, warm beat acknowledging the gentle move into a new part before asking (never name it like a form section).";
    }
    if (decision.state.phase === 2 && decision.state.index >= PHASE2_LEN - 2) {
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
