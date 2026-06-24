import fs from "node:fs";
import path from "node:path";
import { NUMERIC_KEYS, DECISIVE_KEYS, CSV_COLUMNS } from "./rubric.ts";

const DEFAULT_OUT = path.join(import.meta.dirname, ".runs");

type KeymapEntry = { blind_id: string; fixture: string; model: string; label: string; ok: boolean };
type Keymap = { models: { id: string; label: string }[]; entries: KeymapEntry[] };

function resolveRunDir(argv: string[]): string {
  const explicit = argv.find((a) => !a.startsWith("--"));
  if (explicit) return explicit;
  if (!fs.existsSync(DEFAULT_OUT)) throw new Error(`no runs found in ${DEFAULT_OUT} - run ab:run first`);
  const dirs = fs
    .readdirSync(DEFAULT_OUT)
    .filter((d) => fs.statSync(path.join(DEFAULT_OUT, d)).isDirectory())
    .sort(); // ISO stamps sort chronologically
  if (dirs.length === 0) throw new Error(`no runs found in ${DEFAULT_OUT}`);
  return path.join(DEFAULT_OUT, dirs[dirs.length - 1]);
}

// Minimal CSV: only the trailing `notes` column may contain commas, so everything before it splits
// cleanly and the remainder rejoins into notes.
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const parts = line.split(",");
    const fixed = parts.slice(0, header.length - 1);
    const last = parts.slice(header.length - 1).join(",");
    const row: Record<string, string> = {};
    header.forEach((col, i) => (row[col] = i < header.length - 1 ? (fixed[i] ?? "") : last));
    return row;
  });
}

function mean(xs: number[]): number {
  return xs.length === 0 ? NaN : xs.reduce((a, b) => a + b, 0) / xs.length;
}

function fmt(x: number): string {
  return Number.isNaN(x) ? "  - " : x.toFixed(2);
}

function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join("  ");
  return [line(headers), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n");
}

function main(): void {
  const runDir = resolveRunDir(process.argv.slice(2));
  const keymap: Keymap = JSON.parse(fs.readFileSync(path.join(runDir, "keymap.json"), "utf8"));
  const csvPath = path.join(runDir, "scoresheet.csv");
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const byBlind = new Map(keymap.entries.map((e) => [e.blind_id, e]));

  // model id -> dimension -> scores; and model id -> fixture -> dimension -> scores (head-to-head)
  const agg = new Map<string, Map<string, number[]>>();
  const perFixture = new Map<string, Map<string, Map<string, number>>>();
  let scoredCells = 0;

  for (const row of rows) {
    const entry = byBlind.get(row.blind_id);
    if (!entry) continue;
    for (const key of NUMERIC_KEYS) {
      const v = Number(row[key]);
      if (!row[key] || Number.isNaN(v)) continue;
      scoredCells++;
      if (!agg.has(entry.model)) agg.set(entry.model, new Map());
      const dim = agg.get(entry.model)!;
      dim.set(key, [...(dim.get(key) ?? []), v]);
      const fx = perFixture.get(entry.fixture) ?? new Map();
      const fxModel = fx.get(entry.model) ?? new Map();
      fxModel.set(key, v);
      fx.set(entry.model, fxModel);
      perFixture.set(entry.fixture, fx);
    }
  }

  console.log(`run: ${runDir}`);
  if (scoredCells === 0) {
    console.log(`\nno scores filled in yet. Edit ${csvPath} (1-5 per cell), then re-run ab:tally.`);
    return;
  }

  const labelOf = (id: string) => keymap.models.find((m) => m.id === id)?.label ?? id;
  const modelIds = keymap.models.map((m) => m.id).filter((id) => agg.has(id));

  // Per-model means
  const meanFor = (id: string, key: string) => mean(agg.get(id)?.get(key) ?? []);
  const decisiveAvg = (id: string) => mean(DECISIVE_KEYS.map((k) => meanFor(id, k)).filter((x) => !Number.isNaN(x)));
  const overallAvg = (id: string) => mean(NUMERIC_KEYS.map((k) => meanFor(id, k)).filter((x) => !Number.isNaN(x)));

  console.log(`\n== mean score per model (1-5) ==\n`);
  console.log(
    table(
      ["model", ...NUMERIC_KEYS, "DECISIVE", "overall"],
      modelIds.map((id) => [
        labelOf(id),
        ...NUMERIC_KEYS.map((k) => fmt(meanFor(id, k))),
        fmt(decisiveAvg(id)),
        fmt(overallAvg(id)),
      ]),
    ),
  );
  console.log(`\nDECISIVE = mean of [${DECISIVE_KEYS.join(", ")}] - the switch triad.`);

  // Head-to-head wins per dimension (fixtures where >1 model scored)
  console.log(`\n== head-to-head wins per dimension (across fixtures) ==\n`);
  const winRows = NUMERIC_KEYS.map((key) => {
    const wins = new Map<string, number>();
    for (const fx of perFixture.values()) {
      const scored = modelIds.map((id) => [id, fx.get(id)?.get(key)] as const).filter(([, v]) => v !== undefined);
      if (scored.length < 2) continue;
      const top = Math.max(...scored.map(([, v]) => v as number));
      const leaders = scored.filter(([, v]) => v === top);
      if (leaders.length === 1) wins.set(leaders[0][0], (wins.get(leaders[0][0]) ?? 0) + 1);
    }
    return [key, ...modelIds.map((id) => String(wins.get(id) ?? 0))];
  });
  console.log(table(["dimension", ...modelIds.map(labelOf)], winRows));

  // Decision guidance: switch off Claude only if a GPT model beats the best Claude model on ALL THREE
  // decisive dims. (See memory: hebrew-model-choice.)
  const claudeIds = modelIds.filter((id) => !id.startsWith("gpt") && !id.startsWith("gemini"));
  const challengerIds = modelIds.filter((id) => id.startsWith("gpt") || id.startsWith("gemini"));
  console.log(`\n== switch verdict ==\n`);
  if (claudeIds.length === 0 || challengerIds.length === 0) {
    console.log("need at least one Claude model and one challenger scored to render a verdict.");
  } else {
    const bestClaude = claudeIds.reduce((a, b) => (decisiveAvg(b) > decisiveAvg(a) ? b : a));
    console.log(`incumbent (best Claude on decisive dims): ${labelOf(bestClaude)}`);
    let anySwitch = false;
    for (const id of challengerIds) {
      const margins = DECISIVE_KEYS.map((k) => ({ k, d: meanFor(id, k) - meanFor(bestClaude, k) }));
      const beatsAll = margins.every((m) => m.d > 0.25); // a clear win, not noise
      anySwitch ||= beatsAll;
      const detail = margins
        .map((m) => `${m.k} ${Number.isNaN(m.d) ? "n/a" : (m.d >= 0 ? "+" : "") + m.d.toFixed(2)}`)
        .join(", ");
      console.log(`  ${labelOf(id)}: ${beatsAll ? "BEATS" : "does NOT beat"} ${labelOf(bestClaude)} on all 3 (${detail})`);
    }
    console.log(
      anySwitch
        ? `\n-> A challenger clears the bar (>0.25 on translationese, gender AND warmth). Consider switching - re-run to confirm it is stable, not a one-sample fluke.`
        : `\n-> No challenger beats Claude decisively on all three. Default holds: stay on Claude.`,
    );
  }
}

main();
