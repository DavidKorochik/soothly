// The scoring rubric, derived from docs/hebrew_voice.md (the cringe checklist) and the synthesis
// prompt's ONE RULE. Each dimension is scored 1-5 by a native Hebrew reader on a blinded book.
// Shared by run.ts (scoresheet headers) and tally.ts (parsing + aggregation).

export type Dimension = {
  key: string; // CSV column name
  label: string;
  hint: string; // what a 5 vs a 1 means, for the rater
  decisive: boolean; // part of the switch-decision triad (translationese + gender + warmth)
};

export const DIMENSIONS: Dimension[] = [
  {
    key: "translationese",
    label: "טבעיות / לא-תרגומית",
    hint: "5 = עברית ילידית לגמרי, אפס קלקות. 1 = אנגלית במילים עבריות (בסופו של יום, לספק חוויה).",
    decisive: true,
  },
  {
    key: "slop",
    label: "ללא קלישאות העצמה/תרפיה",
    hint: "5 = אפס מילון self-help (מסע, צמיחה, נבכי הנשמה, מרחב בטוח). 1 = פוסטר מוטיבציה.",
    decisive: false,
  },
  {
    key: "gender",
    label: "התאמת מגדר",
    hint: "המגדר ידוע מראש. 5 = הטיה עקבית עד סוף כל משפט. 1 = גלישה/ערבוב מגדר לאורך הפרקים.",
    decisive: true,
  },
  {
    key: "anchoring",
    label: "עיגון (הכלל האחד)",
    hint: "5 = כל שורה נכונה רק על האדם הזה. 1 = הורוסקופ שמתאים לכל אחד.",
    decisive: false,
  },
  {
    key: "warmth",
    label: "חום ורגיסטר ספרותי-דיבורי",
    hint: "5 = חם, מדויק, אנושי. 1 = נוקשה/אקדמי/קליני (החולשה הידועה של קלוד) או מתחנף.",
    decisive: true,
  },
  {
    key: "overall",
    label: "כללי - היית רוצה לקבל את זה",
    hint: "5 = ספר שהייתי שמח לקבל במתנה. 1 = הייתי נעלב.",
    decisive: false,
  },
];

export const NUMERIC_KEYS = DIMENSIONS.map((d) => d.key);
export const DECISIVE_KEYS = DIMENSIONS.filter((d) => d.decisive).map((d) => d.key);
export const CSV_COLUMNS = ["fixture", "blind_id", ...NUMERIC_KEYS, "notes"];
