import { z } from "zod";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { evaluateAnswer } from "@/lib/interview/evaluate";
import { decideNext, type EngineState } from "@/lib/interview/engine";
import { questionAt, PHASE1_LEN, PHASE2_LEN } from "@/lib/interview/spine";
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

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemFor(gender, name, directiveFor(decision)),
    messages,
    temperature: 0.7,
  });

  return result.toTextStreamResponse({
    headers: {
      "X-Engine": JSON.stringify(decision.state),
      "X-Done": decision.action === "complete" ? "1" : "0",
    },
  });
}
