import { streamText, type LanguageModel } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { buildSynthesisPrompt, type SynthesisInput } from "../../lib/synthesis/prompt.ts";
import { parseBook, type Book } from "../../lib/synthesis/parse.ts";

// Mirrors lib/synthesis/synthesize.ts SYSTEM. If production's system prompt changes, mirror it here so
// the bake-off measures what we actually ship.
const SYSTEM =
  "אתה כותב את הספר בעברית בלבד. התחל מיד בסמן [TITLE], בלי שום טקסט לפניו. הפק אך ורק את הספר עם הסמנים (markers) בדיוק כפי שהוגדר - בלי הקדמה, בלי הסברים, בלי מחשבות, בלי טקסט באנגלית.";

// Higher than production's 180s: the eval is offline with no request maxDuration to respect, and a
// full 32K-token book streams slowly. A tight bound here just produces spurious timeouts.
const GENERATE_TIMEOUT_MS = 300_000;
const MAX_OUTPUT_TOKENS = 32_000;

export type ModelSpec = {
  id: string; // stable key used in the keymap + results (no spaces)
  label: string; // human label shown only after un-blinding
  model: LanguageModel;
  temperature?: number; // omitted by default; Opus 4.8 rejects it, GPT-5 reasoning models ignore it
};

// The contenders. Edit this list to add/remove a model - that is the whole point of the harness.
// IMPORTANT: confirm the exact OpenAI model id against the current model list before a real run
// (the research referenced gpt-5.1 / gpt-5.5; ids drift). Adding Gemini = `npm i -D @ai-sdk/google`
// then `import { google } from "@ai-sdk/google"` and one more entry below.
export const MODELS: ModelSpec[] = [
  { id: "opus-4-8", label: "Claude Opus 4.8", model: anthropic("claude-opus-4-8") },
  { id: "sonnet-4-6", label: "Claude Sonnet 4.6", model: anthropic("claude-sonnet-4-6") },
  { id: "gpt-5-1", label: "GPT-5.1", model: openai("gpt-5.1") },
  // { id: "gemini-3-pro", label: "Gemini 3 Pro", model: google("gemini-3-pro") },
];

export function selectModels(ids?: string[]): ModelSpec[] {
  if (!ids || ids.length === 0) return MODELS;
  const wanted = new Set(ids);
  const picked = MODELS.filter((m) => wanted.has(m.id));
  const missing = ids.filter((id) => !MODELS.some((m) => m.id === id));
  if (missing.length > 0) throw new Error(`unknown model id(s): ${missing.join(", ")}`);
  return picked;
}

export type GenerationResult = { raw: string; book: Book; ms: number };

// Generates the RAW book straight from the production prompt, with NO quality gate / repair pass.
// That is deliberate: prod's repair pass runs on Claude, so applying it to a GPT draft would measure
// a Claude-repaired GPT book, not GPT. The bake-off compares each model's own unaided Hebrew.
export async function generateBook(
  spec: ModelSpec,
  input: SynthesisInput,
  timeoutMs = GENERATE_TIMEOUT_MS,
): Promise<GenerationResult> {
  const startedAt = Date.now();
  const result = streamText({
    model: spec.model,
    system: SYSTEM,
    prompt: buildSynthesisPrompt(input),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: spec.temperature,
    abortSignal: AbortSignal.timeout(timeoutMs),
    onError: ({ error }) =>
      console.error(`  [${spec.id}] stream error:`, error instanceof Error ? error.message : String(error)),
  });
  const raw = await result.text;
  if (!raw.trim()) throw new Error(`[${spec.id}] produced empty output`);
  return { raw, book: parseBook(raw), ms: Date.now() - startedAt };
}
