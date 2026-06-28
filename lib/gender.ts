// The person's chosen form of address for Hebrew. It is grammatical, not an identity label:
// "neutral" means write gender-neutral Hebrew (the intake asks "how should we address you?").
export const GENDERS = ["male", "female", "neutral"] as const;
export type Gender = (typeof GENDERS)[number];

// The directive the interview and synthesis prompts use to set how the model conjugates Hebrew.
// Masculine/feminine conjugate as usual; neutral writes gender-neutral Hebrew and never guesses a gender.
export function genderDirective(gender: Gender): string {
  if (gender === "male") {
    return "Address the person in MASCULINE Hebrew - conjugate every verb, adjective, and pronoun (אתה) masculine, consistently. Never mix forms.";
  }
  if (gender === "female") {
    return "Address the person in FEMININE Hebrew - conjugate every verb, adjective, and pronoun (את) feminine, consistently. Never mix forms.";
  }
  return [
    "The person has NOT given a gender - never assume or guess one. Write GENDER-NEUTRAL Hebrew throughout, so no word reveals a gender:",
    '- Turn a 2nd-person present-tense statement into a nominal phrase (instead of "את יודעת" / "אתה יודע" write "זו היכולת לדעת").',
    "- Lean on 2nd-person PAST tense and the possessives שלך / לך / אותך - written identically for both genders (סיפרת, הבנת, השארת, כתבת).",
    '- Replace a gendered imperative with a question or impersonal "אפשר" + infinitive (instead of "ספר/ספרי" write "מה היה...?" or "אפשר לספר").',
    "- NEVER use slash-forms (את/ה, ספר/י) or inner-dot forms (יודע.ת) - rephrase instead.",
    "Re-read every sentence and confirm nothing is conjugated to a gender.",
  ].join("\n");
}
