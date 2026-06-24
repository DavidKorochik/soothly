import { z } from "zod";
import { transcribeAudio } from "@/lib/transcription/transcribe";
import { TranscriptionError } from "@/lib/transcription/errors";
import { logFunnel } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SessionSchema = z.string().uuid();

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "קלט לא תקין" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob)) {
    return Response.json({ error: "קלט לא תקין" }, { status: 400 });
  }

  const rawSessionId = form.get("sessionId");
  const session = typeof rawSessionId === "string" ? SessionSchema.safeParse(rawSessionId) : null;
  const sessionId = session?.success ? session.data : undefined;

  try {
    const { text } = await transcribeAudio(audio);
    if (sessionId) {
      await logFunnel({
        sessionId,
        event: "voice_transcribed",
        meta: { bytes: audio.size, chars: text.length },
      });
    }
    return Response.json({ text });
  } catch (error) {
    if (error instanceof TranscriptionError) {
      if (sessionId) {
        await logFunnel({
          sessionId,
          event: "voice_transcribe_failed",
          meta: { code: error.code },
        });
      }
      return Response.json({ error: error.userMessage }, { status: error.status });
    }
    console.error("transcription route failed", error);
    return Response.json({ error: "התמלול נכשל. נסו שוב או הקלידו ידנית." }, { status: 500 });
  }
}
