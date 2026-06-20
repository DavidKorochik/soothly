export const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
export const OPENAI_TRANSCRIBE_MODEL = "gpt-4o-transcribe";
export const TRANSCRIBE_LANGUAGE = "he";

// Vercel serverless request bodies are capped near 4.5MB, well below any vendor limit — that
// platform cap is the real ceiling. At 16kHz mono this is several minutes of speech, comfortably
// longer than one spoken answer; the client also stops recording before reaching it.
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

// Container MIME bases MediaRecorder emits across browsers (Chrome/Firefox webm/opus, iOS Safari
// mp4/aac), each of which the OpenAI transcription endpoint accepts. Matched on the base only —
// the codec parameter (";codecs=opus") is stripped before the lookup.
export const ACCEPTED_MIME: ReadonlySet<string> = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mpeg",
  "audio/mpga",
  "audio/wav",
  "audio/x-wav",
]);

// Filename extension OpenAI infers the format from; keyed by MIME base.
export const MIME_EXTENSION: Readonly<Record<string, string>> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/mpga": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export function mimeBase(type: string): string {
  return type.split(";")[0].trim().toLowerCase();
}

export function normalizeTranscript(raw: string): string {
  return raw.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
