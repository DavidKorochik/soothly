import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildSynthesisPrompt, type SynthesisInput } from "./prompt";
import { parseBook, type Book } from "./parse";

export async function synthesizeBook(input: SynthesisInput): Promise<Book> {
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    system:
      "אתה כותב את הספר בעברית בלבד. הפק אך ורק את הספר עם הסמנים (markers) בדיוק כפי שהוגדר — בלי הקדמה, בלי הסברים, בלי טקסט באנגלית.",
    prompt: buildSynthesisPrompt(input),
    temperature: 0.7,
    maxOutputTokens: 32000,
  });
  return parseBook(text);
}
