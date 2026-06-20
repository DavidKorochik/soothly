export type Severity = "none" | "low" | "moderate" | "high";

export type Classification = {
  crisis: boolean;
  severity: Severity;
  signals: string[];
  rationale: string;
};

export type SafetyDecision = { proceed: true } | { proceed: false; message: string };

// Shown when generation is paused for human review. Warm, hopeful, never clinical; real resources.
export const SUPPORT_MESSAGE = `תודה ששיתפת. חלק ממה שכתבת נגע בדברים כבדים, ואנחנו רוצים להחזיק אותם בעדינות - לא להעביר אותם דרך מכונה. לכן הספר שלך לא ייווצר אוטומטית עכשיו; אדם אמיתי יקרא את מה שכתבת, ונחזור אליך.

ואם קשה לך דווקא עכשיו - אינך לבד, ויש עם מי לדבר, מתי שבא לך:
ער״ן - קו תמיכה רגשית, טלפון 1201, 24 שעות ביממה.
סה״ר - תמיכה אנונימית בצ׳אט באתר sahar.org.il.

אנחנו כאן.`;

// Reflective/past pain (the heart of this product) must pass; only genuine current crisis blocks.
export function decide(c: Classification): SafetyDecision {
  const block = c.crisis || c.severity === "high";
  return block ? { proceed: false, message: SUPPORT_MESSAGE } : { proceed: true };
}
