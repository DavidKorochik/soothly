export type Theme = {
  key: string;
  chapter: number; // index into CHAPTER_LABELS — the arc tier (warm -> tender -> closing)
  question: string;
  desc: string; // English, terse — fed to the planner to spot already-told stories and pick what's next
};

// Named arcs, warm -> tender -> closing. The interview reads as a few short chapters, never "Q 7 of 16".
export const CHAPTER_LABELS = [
  "הסיפור מתחיל",
  "מאיפה באת",
  "רגעים שעיצבו אותך",
  "מה שמתחת לפני השטח",
  "מי שנהיית",
  "ולאן מכאן",
];

// The full theme pool, in arc order. The engine asks "now" first, then selects responsively within the
// earliest chapter that still has an uncovered theme — so the warm->tender arc is guaranteed while
// ordering inside a chapter, opportunistic deepening, and skipping already-told themes stay dynamic.
export const THEMES: Theme[] = [
  { key: "now", chapter: 0, question: "ספר/י לי - איפה את/ה בחיים שלך עכשיו, מה ממלא את הימים שלך בתקופה הזו?", desc: "where they are in life right now, what fills their days" },
  { key: "why_now", chapter: 0, question: "מה הביא אותך לשבת ולהסתכל על עצמך דווקא עכשיו?", desc: "what brought them to stop and reflect on themselves now" },
  { key: "roots", chapter: 1, question: "באיזה בית גדלת, ואיזו אווירה הייתה בו?", desc: "the home and family they grew up in, and its atmosphere" },
  { key: "childhood", chapter: 1, question: "דבר אחד מהילדות שעיצב אותך יותר משמתחשק להודות - מה קרה שם בדיוק?", desc: "one formative childhood moment, the scene itself" },
  { key: "turning", chapter: 2, question: "רגע אחד שאחריו כבר לא היית אותו אדם. מה קרה בדיוק?", desc: "a turning point after which they were no longer the same person" },
  { key: "decision", chapter: 2, question: "ספר/י לי על החלטה אחת ששינתה את מסלול חייך. איך הגעת אליה?", desc: "one decision that changed the course of their life, and how they reached it" },
  { key: "hardship", chapter: 2, question: "מה היה הזמן הכי קשה שעברת? קח/י את הזמן, אין למה למהר.", desc: "the hardest period they ever went through" },
  { key: "failure", chapter: 2, question: "כישלון אחד שאת/ה עדיין נושא/ת איתך. מה הוא לימד אותך?", desc: "a failure they still carry, and what it taught them" },
  { key: "people", chapter: 3, question: "מי האדם שהכי עיצב אותך - לטוב או לרע? דוגמה ספציפית.", desc: "the person who shaped them most, for better or worse, with a specific example" },
  { key: "pattern", chapter: 3, question: "מה חוזר אצלך שוב ושוב - אותו מצב, אותה תגובה, אותו סוג של אנשים?", desc: "a pattern that repeats in their life — situation, reaction, or kind of people" },
  { key: "fear", chapter: 3, question: "ממה את/ה הכי פוחד/ת באמת - לא התשובה היפה?", desc: "their deepest real fear, not the polished answer" },
  { key: "shadow", chapter: 3, question: "מה מחזיק אותך אחורה? משהו שאת/ה מתחרט/ת עליו?", desc: "what holds them back; something they regret" },
  { key: "insight", chapter: 4, question: "מהי תובנה אחת על החיים שהגעת אליה בדרך הקשה?", desc: "one insight about life they reached the hard way" },
  { key: "change", chapter: 4, question: "מה השתנה אצלך לאט לאורך השנים, בלי רגע אחד גדול שאפשר להצביע עליו?", desc: "slow, cumulative change over time, with no single dramatic moment - distinct from the `turning` point" },
  { key: "future", chapter: 5, question: "איזו גרסה של עצמך את/ה הכי רוצה להיות?", desc: "the version of themselves they most want to become" },
  { key: "pride", chapter: 5, question: "מה את/ה הכי גאה בו - שכמעט לא סיפרת עליו לאף אחד?", desc: "what they are most proud of, that they have barely told anyone" },
];

export const TOTAL_THEMES = THEMES.length;
export const OPENING_THEME = THEMES[0]; // "now" — asked first, before any planning

const BY_KEY = new Map(THEMES.map((t) => [t.key, t]));
export function themeByKey(key: string): Theme | undefined {
  return BY_KEY.get(key);
}

// The themes we may ask next: the uncovered themes in the earliest chapter that still has one. Earlier
// chapters are fully covered by definition, later chapters stay locked — so the warm->tender arc holds,
// a chapter answered wholesale up front is skipped, and ordering within a chapter is free to be responsive.
export function reachableThemes(covered: readonly string[]): Theme[] {
  const done = new Set(covered);
  const uncovered = THEMES.filter((t) => !done.has(t.key));
  if (uncovered.length === 0) return [];
  const frontier = Math.min(...uncovered.map((t) => t.chapter));
  return uncovered.filter((t) => t.chapter === frontier);
}

// Fold the current theme (and any themes the answer already told, garbage keys filtered out) into the
// covered set, and compute the arc-reachable themes to ask next. Lives here because it needs the theme
// data; the engine consumes the result so it can stay pure and import-free.
export function nextCoverage(covered: readonly string[], current: string, alsoTold: readonly string[] = []) {
  const folded = [...new Set([...covered, current, ...alsoTold.filter((k) => BY_KEY.has(k))])];
  return { covered: folded, reachable: reachableThemes(folded).map((t) => t.key) };
}
