import fs from "node:fs";
import path from "node:path";

export type SynthesisInput = {
  name: string;
  gender: "male" | "female";
  age: number;
  answers: string;
};

let template: string | null = null;
function load(): string {
  return (template ??= fs.readFileSync(
    path.join(process.cwd(), "docs", "synthesis_prompt_v2.md"),
    "utf8",
  ));
}

export function buildSynthesisPrompt(input: SynthesisInput): string {
  return load()
    .replaceAll("{{NAME}}", input.name)
    .replaceAll("{{GENDER}}", input.gender)
    .replaceAll("{{AGE}}", String(input.age))
    .replace("{{PASTE RAW ANSWERS HERE}}", input.answers);
}
