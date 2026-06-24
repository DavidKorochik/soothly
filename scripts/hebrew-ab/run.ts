import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { z } from "zod";
import { selectModels, generateBook, type ModelSpec } from "./models.ts";
import { renderBookHtml } from "./render.ts";
import { CSV_COLUMNS, NUMERIC_KEYS } from "./rubric.ts";

const HERE = import.meta.dirname;
const DEFAULT_FIXTURES = path.join(HERE, "fixtures");
const DEFAULT_OUT = path.join(HERE, ".runs");

const FixtureSchema = z.object({
  name: z.string().min(1),
  gender: z.enum(["male", "female"]),
  age: z.number().int().positive(),
  answers: z.string().min(50, "answers look too thin to produce a real book"),
});

type Args = { models?: string[]; fixtures: string; out: string; concurrency: number };

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    models: get("--models")?.split(",").map((s) => s.trim()).filter(Boolean),
    fixtures: get("--fixtures") ?? DEFAULT_FIXTURES,
    out: get("--out") ?? DEFAULT_OUT,
    concurrency: Number(get("--concurrency") ?? 3),
  };
}

function loadFixtures(dir: string): { id: string; input: z.infer<typeof FixtureSchema> }[] {
  if (!fs.existsSync(dir)) throw new Error(`fixtures dir not found: ${dir}`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) throw new Error(`no .json fixtures in ${dir}`);
  return files.map((file) => {
    const id = path.basename(file, ".json");
    // The id becomes a path segment AND a CSV cell (blind_id). Constrain it to a safe charset with an
    // alphanumeric lead, which blocks path tricks, empty ids, and CSV/formula injection in one check.
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) {
      throw new Error(`unsafe fixture filename "${file}" - use letters/digits then [A-Za-z0-9._-]`);
    }
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const parsed = FixtureSchema.safeParse(raw);
    if (!parsed.success) throw new Error(`invalid fixture ${file}: ${parsed.error.message}`);
    return { id, input: parsed.data };
  });
}

function requireKeys(models: ModelSpec[]): void {
  const needOpenAI = models.some((m) => m.id.startsWith("gpt"));
  const needGoogle = models.some((m) => m.id.startsWith("gemini"));
  const needAnthropic = models.some((m) => !m.id.startsWith("gpt") && !m.id.startsWith("gemini"));
  const missing: string[] = [];
  if (needAnthropic && !process.env.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
  if (needOpenAI && !process.env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
  if (needGoogle && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) missing.push("GOOGLE_GENERATIVE_AI_API_KEY");
  if (missing.length > 0) throw new Error(`missing env for selected models: ${missing.join(", ")}`);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const runners = Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, async () => {
    let item: T | undefined;
    while ((item = queue.shift()) !== undefined) await worker(item);
  });
  await Promise.all(runners);
}

type Entry = {
  blind_id: string;
  fixture: string;
  model: string;
  label: string;
  ok: boolean;
  ms?: number;
  error?: string;
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const models = selectModels(args.models);
  const fixtures = loadFixtures(args.fixtures);
  requireKeys(models);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(args.out, stamp);
  fs.mkdirSync(path.join(runDir, "raw"), { recursive: true });

  console.log(`bake-off: ${fixtures.length} fixture(s) x ${models.length} model(s) = ${fixtures.length * models.length} books`);
  console.log(`models: ${models.map((m) => m.id).join(", ")}`);
  console.log(`output: ${runDir}\n`);

  const tasks = fixtures.flatMap((f) => models.map((m) => ({ fixture: f, model: m })));
  const entries: Entry[] = [];

  await pool(shuffle(tasks), args.concurrency, async ({ fixture, model }) => {
    const blind_id = `${fixture.id}__${crypto.randomUUID().slice(0, 8)}`;
    try {
      const { raw, book, ms } = await generateBook(model, fixture.input);
      fs.mkdirSync(path.join(runDir, fixture.id), { recursive: true });
      fs.writeFileSync(path.join(runDir, fixture.id, `${blind_id}.html`), renderBookHtml(book, blind_id));
      fs.writeFileSync(path.join(runDir, "raw", `${blind_id}.txt`), raw);
      entries.push({ blind_id, fixture: fixture.id, model: model.id, label: model.label, ok: true, ms });
      console.log(`  ok   ${fixture.id} / ${model.id}  (${(ms / 1000).toFixed(1)}s, ${book.chapters.length} ch)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      entries.push({ blind_id, fixture: fixture.id, model: model.id, label: model.label, ok: false, error: message });
      console.log(`  FAIL ${fixture.id} / ${model.id}  ${message}`);
    }
  });

  // keymap.json - the un-blinding key (gitignored). tally.ts joins scores back to models through it.
  fs.writeFileSync(
    path.join(runDir, "keymap.json"),
    JSON.stringify({ createdAt: stamp, models: models.map((m) => ({ id: m.id, label: m.label })), entries }, null, 2),
  );

  // scoresheet.csv - blank numeric cells for the native rater. Rows shuffled within each fixture so
  // adjacency never leaks which model is which.
  const ok = entries.filter((e) => e.ok);
  const rows = fixtures
    .flatMap((f) => shuffle(ok.filter((e) => e.fixture === f.id)))
    .map((e) => [e.fixture, e.blind_id, ...NUMERIC_KEYS.map(() => ""), ""].join(","));
  fs.writeFileSync(path.join(runDir, "scoresheet.csv"), [CSV_COLUMNS.join(","), ...rows].join("\n") + "\n");

  const failed = entries.filter((e) => !e.ok).length;
  console.log(`\ndone. ${ok.length} books, ${failed} failed.`);
  console.log(`\nnext:`);
  console.log(`  1. open the .html files under ${runDir}/<fixture>/ - read each blinded book`);
  console.log(`  2. fill scores (1-5) into ${path.join(runDir, "scoresheet.csv")}`);
  console.log(`  3. npm run ab:tally        (reads the latest run; or pass the run dir)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
