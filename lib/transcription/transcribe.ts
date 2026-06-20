import { ACCEPTED_MIME, MAX_AUDIO_BYTES, mimeBase, normalizeTranscript } from "./constants";
import { TranscriptionError } from "./errors";
import { transcribeWithOpenAI } from "./openai";

// The interview's voice-dictation stage: validate the uploaded audio at the boundary, transcribe
// it, and return clean Hebrew text. Fail-closed — on any doubt it throws rather than returning an
// empty or fabricated answer; the caller keeps the user on the always-available textarea.
export async function transcribeAudio(audio: Blob): Promise<{ text: string }> {
  if (audio.size === 0) throw new TranscriptionError("empty_audio");
  if (audio.size > MAX_AUDIO_BYTES) throw new TranscriptionError("too_large");
  if (!ACCEPTED_MIME.has(mimeBase(audio.type))) throw new TranscriptionError("unsupported_format");

  const { text } = await transcribeWithOpenAI(audio);
  const normalized = normalizeTranscript(text);
  if (!normalized) throw new TranscriptionError("empty_audio");

  return { text: normalized };
}
