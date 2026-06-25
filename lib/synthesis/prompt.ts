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
  // Function replacers for the free-text fields: a literal `$` sequence in a name or answer
  // ($&, $`, $', $$) is otherwise read as a special replacement pattern and silently corrupts
  // the prompt (e.g. `$\`` duplicates the whole preamble into the answers). gender/age are safe.
  return load()
    .replaceAll("{{NAME}}", () => input.name)
    .replaceAll("{{GENDER}}", input.gender)
    .replaceAll("{{AGE}}", String(input.age))
    .replace("{{PASTE RAW ANSWERS HERE}}", () => input.answers);
}
