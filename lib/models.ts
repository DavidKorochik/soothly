import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// Central model registry for every model call in the pipeline. We're A/B testing the whole Hebrew
// pipeline on OpenAI against the original Claude lineup, so the provider is a single switch: the default
// is OpenAI; set MODEL_PROVIDER=anthropic to restore the Claude lineup everywhere at once.
//
// The OpenAI side runs gpt-5.1 across all stages. It's a reasoning model, so it rejects `temperature`
// (the AI SDK warns and drops it) - the OpenAI stages therefore carry no temperature, and call sites
// read the value from here so the Claude fallback keeps its tuned sampling. Verified against the real
// per-stage budgets: the interview streams first tokens in ~1-2s (well under the client's 25s stall
// watchdog) with full output at its 400-token cap and zero reasoning tokens on a short turn; the
// planner/safety/quality `generateObject` calls return valid objects in ~1-2s; the book streams in full.

export type Stage = "book" | "interview" | "planner" | "safety" | "quality" | "repair";

export type StageModel = { model: LanguageModel; temperature?: number };

const OPENAI: Record<Stage, StageModel> = {
  book: { model: openai("gpt-5.1") },
  interview: { model: openai("gpt-5.1") },
  planner: { model: openai("gpt-5.1") },
  safety: { model: openai("gpt-5.1") },
  quality: { model: openai("gpt-5.1") },
  repair: { model: openai("gpt-5.1") },
};

// The original production lineup, tiered by cost/latency. Opus (like the OpenAI reasoning model) rejects
// temperature and so carries none; the Sonnet/Haiku stages keep their tuned sampling.
const ANTHROPIC: Record<Stage, StageModel> = {
  book: { model: anthropic("claude-opus-4-8") },
  interview: { model: anthropic("claude-sonnet-4-6"), temperature: 0.7 },
  planner: { model: anthropic("claude-sonnet-4-6"), temperature: 0 },
  safety: { model: anthropic("claude-sonnet-4-6"), temperature: 0 },
  quality: { model: anthropic("claude-haiku-4-5"), temperature: 0 },
  repair: { model: anthropic("claude-sonnet-4-6"), temperature: 0 },
};

const useOpenAI = process.env.MODEL_PROVIDER !== "anthropic";

export function modelFor(stage: Stage): StageModel {
  // Fail fast with a clear message when the active provider's key is missing. Without this, a missing
  // OPENAI_API_KEY surfaces as an SDK error inside the fail-CLOSED safety stage, which would show the
  // user the crisis-support message instead of a config error. Callers invoke this at request time (not
  // module load), so this never throws during build.
  if (useOpenAI && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set - required for the model pipeline (or set MODEL_PROVIDER=anthropic).");
  }
  return (useOpenAI ? OPENAI : ANTHROPIC)[stage];
}
