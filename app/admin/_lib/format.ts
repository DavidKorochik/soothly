// Pure, total formatting helpers for the admin views — every one returns a safe string ("—" on
// missing) so the pages never branch on null.

export function formatDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return "—";
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function pct(part: number, whole: number): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export function round1(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return String(Math.round(n * 10) / 10);
}

export function genderLabel(g: "male" | "female"): string {
  return g === "male" ? "M" : "F";
}

export function ageDisplay(age: number): string {
  return String(age);
}

export function formatTimestamp(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

// A thin answer earns follow-ups below this depth (mirrors engine DEPTH_THRESHOLD).
export const WEAK_DEPTH = 3;

// A question's avg-time is "weak" (slow) when it is well above the typical time and not trivially
// short. Relative-to-median stays stable at small N without any charting.
export function weakTimeThreshold(avgTimes: (number | null)[]): number | null {
  const xs = avgTimes.filter((v): v is number => typeof v === "number" && v > 0).sort((a, b) => a - b);
  if (xs.length < 2) return null;
  const mid = Math.floor(xs.length / 2);
  const median = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  return Math.max(60, median * 1.5);
}
