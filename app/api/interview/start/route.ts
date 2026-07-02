import { z } from "zod";
import { streamText } from "ai";
import { modelFor } from "@/lib/models";
import { createSession, logFunnel } from "@/lib/db/queries";
import { START } from "@/lib/interview/engine";
import { systemFor, openingDirective } from "@/lib/interview/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Schema = z.object({
  name: z.string().trim().min(1),
  gender: z.enum(["male", "female", "neutral"]),
  age: z.coerce.number().int().min(1).max(120),
});

export async function POST(req: Request) {
  let input: z.infer<typeof Schema>;
  try {
    input = Schema.parse(await req.json());
  } catch {
    return Response.json({ error: "משהו לא נראה תקין. אפשר לנסות שוב." }, { status: 400 });
  }

  const sessionId = await createSession(input);
  await logFunnel({ sessionId, event: "interview_started", phase: 1 });
  await logFunnel({ sessionId, event: "question_reached", phase: 1, questionKey: "now" });

  const { model, temperature } = modelFor("interview");
  const result = streamText({
    model,
    system: systemFor(input.gender, input.name, openingDirective()),
    prompt: "Begin.",
    temperature,
    // Generous cap for the longer opening (greeting + reassurance + first question); still bounds a
    // runaway. A stalled stream is caught by the client watchdog and surfaced as a retry.
    maxOutputTokens: 500,
    onError: ({ error }) => console.error("[interview/start] model stream failed", { sessionId, error }),
  });

  return result.toTextStreamResponse({
    headers: { "X-Session": sessionId, "X-Engine": JSON.stringify(START) },
  });
}
