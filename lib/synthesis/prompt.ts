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

// One bounded repair pass: hand the already-written book back with the flagged Hebrew problems and
// ask for a same-structure rewrite. Only the flagged phrasing changes; content and anchors stay.
export function buildRepairPrompt(book: string, feedback: string, input: SynthesisInput): string {
  const gender = input.gender === "male" ? "זכר" : "נקבה";
  return `הספר הבא נכתב בעברית, אבל יש בו ביטויים שלא עומדים בקול של המוצר - תרגומית, קלישאות "ספר הדרכה", רהיטות ארכאית או שורות כלליות שמתאימות לכל אחד.

תקן רק את מה שצריך תיקון וכתוב מחדש את הספר כולו בעברית טבעית, חמה ומדויקת - כמו שישראלי משכיל באמת כותב ביד לאדם אחד.
שמור בדיוק על אותו מבנה סמנים ([TITLE], [OPENING], [CH1_NUM], [CH1_TITLE], [CH1_BODY], [CH1_NUGGET] ... [CLOSING]), על אותו תוכן ועל אותם עוגנים מהסיפור. אל תוסיף ואל תשמיט פרקים, ואל תמציא עובדות. שנה רק את הניסוח.
מגדר: ${gender} - הטה כל מילה בעקביות, בלי לערבב.
התחל מיד בסמן [TITLE]. הפק אך ורק את הספר עם הסמנים, בלי הקדמה ובלי הסברים.

הבעיות לתיקון:
${feedback}

הספר לתיקון:
${book}`;
}
