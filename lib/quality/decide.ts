export type QualitySeverity = "high" | "medium" | "low";

export const QUALITY_RULES = [
  "translationese",
  "self-help",
  "ai-sentiment",
  "clinical",
  "archaic",
  "slash-gender",
  "gender-agreement",
  "dash",
  "barnum",
  "padding",
  "other",
] as const;

export type QualityRule = (typeof QUALITY_RULES)[number];

export type Violation = {
  rule: QualityRule;
  severity: QualitySeverity;
  quote: string;
  suggestion: string;
};

export type QualityReport = {
  score: number; // 1-5; 5 = flawless native Hebrew
  violations: Violation[];
  summary: string;
};

// A pass needs a solid score AND no must-fix violation. A single high-severity wince fails the text
// even at a high score - the whole point is to catch the line a native reader would stumble on.
export type QualityVerdict =
  | { ok: true; score: number }
  | { ok: false; score: number; violations: Violation[]; feedback: string };

export const MIN_SCORE = 4;

export function decide(report: QualityReport): QualityVerdict {
  const hasHigh = report.violations.some((v) => v.severity === "high");
  if (report.score >= MIN_SCORE && !hasHigh) return { ok: true, score: report.score };
  return {
    ok: false,
    score: report.score,
    violations: report.violations,
    feedback: buildFeedback(report.violations),
  };
}

// Turn the flagged lines into a concrete repair brief for the rewrite pass. Low-severity nits are
// dropped so the repair stays focused on what a reader would actually wince at.
export function buildFeedback(violations: Violation[]): string {
  const actionable = violations.filter((v) => v.severity !== "low");
  const list = actionable.length > 0 ? actionable : violations;
  if (list.length === 0) {
    return 'שפר את איכות העברית לפי קול המותג: טבעית, חמה ומדויקת - בלי תרגומית, קלישאות "ספר הדרכה" או רהיטות ארכאית.';
  }
  return list.map((v) => `- "${v.quote}" (${v.rule}) -> ${v.suggestion}`).join("\n");
}
