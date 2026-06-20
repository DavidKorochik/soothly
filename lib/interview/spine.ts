export type SpineQuestion = { key: string; question: string };

// Phase 1 — light warm-up for context (not evaluated for story depth).
export const PHASE1: SpineQuestion[] = [
  { key: "now", question: "ספר/י לי - איפה את/ה בחיים שלך עכשיו, מה ממלא את הימים שלך בתקופה הזו?" },
  { key: "why_now", question: "מה הביא אותך לשבת ולהסתכל על עצמך דווקא עכשיו?" },
];

// Phase 2 — the deep spine (curated from voice_agent_spec.md), each pulling for a concrete story.
export const PHASE2: SpineQuestion[] = [
  { key: "roots", question: "מאיפה את/ה בא/ה - באיזה בית גדלת, ומה הייתה האווירה בו?" },
  { key: "childhood", question: "דבר אחד מהילדות שעיצב אותך יותר משמתחשק להודות - הסיטואציה עצמה." },
  { key: "turning", question: "רגע אחד שאחריו כבר לא היית אותו אדם. מה קרה בדיוק?" },
  { key: "decision", question: "החלטה אחת ששינתה את מסלול חייך - איך קיבלת אותה, וממה פחדת?" },
  { key: "hardship", question: "הזמן הכי קשה שעברת. קח/י את הזמן." },
  { key: "failure", question: "כישלון אחד שאת/ה עדיין נושא/ת איתך. מה הוא לימד אותך?" },
  { key: "people", question: "מי האדם שהכי עיצב אותך - לטוב או לרע? דוגמה ספציפית." },
  { key: "pattern", question: "מה חוזר אצלך שוב ושוב - אותו מצב, אותה תגובה, אותו סוג של אנשים?" },
  { key: "fear", question: "ממה את/ה הכי פוחד/ת - באמת, לא התשובה היפה." },
  { key: "shadow", question: "מה מחזיק אותך אחורה? משהו שאת/ה מתחרט/ת עליו?" },
  { key: "insight", question: "תובנה אחת על החיים שהגעת אליה בדרך הקשה." },
  { key: "change", question: "במה השתנית הכי הרבה, ומה היית אומר/ת לעצמך מלפני עשר שנים?" },
  { key: "future", question: "איזו גרסה של עצמך את/ה הכי רוצה להיות?" },
  { key: "pride", question: "מה את/ה הכי גאה בו - שכמעט לא סיפרת עליו לאף אחד?" },
];

export const PHASE1_LEN = PHASE1.length;
export const PHASE2_LEN = PHASE2.length;

export function questionAt(phase: 1 | 2, index: number): SpineQuestion | undefined {
  return (phase === 1 ? PHASE1 : PHASE2)[index];
}
