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
    return Response.json({ error: "משהו לא נראה תקין. אפשר לנסות שוב." }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob)) {
    return Response.json({ error: "משהו לא נראה תקין. אפשר לנסות שוב." }, { status: 400 });
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
      }).catch(() => {});
    }
    return Response.json({ text });
  } catch (error) {
    if (error instanceof TranscriptionError) {
      if (sessionId) {
        await logFunnel({
          sessionId,
          event: "voice_transcribe_failed",
          meta: { code: error.code },
        }).catch(() => {});
      }
      return Response.json({ error: error.userMessage }, { status: error.status });
    }
    console.error("transcription route failed", error);
    return Response.json({ error: "התמלול נכשל. אפשר לנסות שוב או להקליד." }, { status: 500 });
  }
}
