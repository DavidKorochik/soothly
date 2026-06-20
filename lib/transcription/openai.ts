import { z } from "zod";
import {
  MIME_EXTENSION,
  OPENAI_TRANSCRIBE_MODEL,
  OPENAI_TRANSCRIBE_URL,
  TRANSCRIBE_LANGUAGE,
  mimeBase,
} from "./constants";
import { TranscriptionError } from "./errors";

const ResponseSchema = z.object({ text: z.string() });

// OpenAI's audio endpoint is no-train + zero abuse-retention by default — the audio leaves the
// device only for this stateless transcription and is never persisted by us.
export async function transcribeWithOpenAI(audio: Blob): Promise<{ text: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error("transcription: OPENAI_API_KEY is not set");
    throw new TranscriptionError("no_provider_key");
  }

  const ext = MIME_EXTENSION[mimeBase(audio.type)] ?? "webm";
  const form = new FormData();
  form.append("file", audio, `answer.${ext}`);
  form.append("model", OPENAI_TRANSCRIBE_MODEL);
  form.append("language", TRANSCRIBE_LANGUAGE);
  form.append("response_format", "json");

  let res: Response;
  try {
    res = await fetch(OPENAI_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
  } catch (error) {
    console.error("transcription: OpenAI request failed", error);
    throw new TranscriptionError("provider_failed", "network");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`transcription: OpenAI returned ${res.status}`, detail.slice(0, 500));
    throw new TranscriptionError("provider_failed", `status ${res.status}`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (error) {
    console.error("transcription: OpenAI response was not JSON", error);
    throw new TranscriptionError("provider_failed", "bad json");
  }

  const parsed = ResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.error("transcription: OpenAI response missing text", parsed.error.message);
    throw new TranscriptionError("provider_failed", "schema");
  }

  return { text: parsed.data.text };
}
