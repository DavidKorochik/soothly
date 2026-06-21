import { z } from "zod";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createSession, logFunnel } from "@/lib/db/queries";
import { START } from "@/lib/interview/engine";
import { systemFor, openingDirective } from "@/lib/interview/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Schema = z.object({
  name: z.string().trim().min(1),
  gender: z.enum(["male", "female"]),
  age: z.coerce.number().int().min(1).max(120),
});

export async function POST(req: Request) {
  let input: z.infer<typeof Schema>;
  try {
    input = Schema.parse(await req.json());
  } catch {
    return Response.json({ error: "קלט לא תקין" }, { status: 400 });
  }

  const sessionId = await createSession(input);
  await logFunnel({ sessionId, event: "interview_started", phase: 1 });
  await logFunnel({ sessionId, event: "question_reached", phase: 1, questionKey: "now" });

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemFor(input.gender, input.name, openingDirective()),
    prompt: "Begin.",
    temperature: 0.7,
    onError: ({ error }) => console.error("[interview/start] model stream failed", { sessionId, error }),
  });

  return result.toTextStreamResponse({
    headers: { "X-Session": sessionId, "X-Engine": JSON.stringify(START) },
  });
}
