export type Chapter = { num: string; title: string; body: string; nugget: string };

export type Book = {
  title: string;
  subtitle: string;
  opening: string;
  chapters: Chapter[];
  closing: string;
};

// The markers the synthesis prompt emits (see docs/synthesis_prompt_v2.md). ONLY these split the
// text - a stray bracketed token in prose (e.g. "[NOTE]" or "[01]") is left as content, never
// treated as a section boundary that would truncate a chapter.
const KNOWN_MARKER = /^(TITLE|OPENING|CLOSING|CH\d+_(NUM|TITLE|BODY|NUGGET))$/;

// Split the text at each recognized [MARKER] and map marker -> the text up to the next one.
function extractMarkers(raw: string): Map<string, string> {
  const re = /\[([A-Z0-9_]+)\]/g;
  const hits: { name: string; contentStart: number; markerStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (!KNOWN_MARKER.test(m[1])) continue;
    hits.push({ name: m[1], contentStart: re.lastIndex, markerStart: m.index });
  }
  const map = new Map<string, string>();
  for (let i = 0; i < hits.length; i++) {
    const end = i + 1 < hits.length ? hits[i + 1].markerStart : raw.length;
    map.set(hits[i].name, raw.slice(hits[i].contentStart, end).trim());
  }
  return map;
}

function must(map: Map<string, string>, name: string): string {
  const v = map.get(name);
  if (!v) throw new Error(`synthesis output missing or empty [${name}]`);
  return v;
}

// The chapter numbers actually present, ascending - tolerant of a gap (a skipped CHn) rather than
// stopping at the first missing index and silently dropping every chapter after it.
function chapterNumbers(map: Map<string, string>): number[] {
  const nums = new Set<number>();
  for (const key of map.keys()) {
    const cm = key.match(/^CH(\d+)_/);
    if (cm) nums.add(Number(cm[1]));
  }
  return [...nums].sort((a, b) => a - b);
}

export function parseBook(raw: string): Book {
  // Strip a stray Markdown code fence if the model ever wraps its output in one, so [TITLE] is still
  // the first thing parsed instead of being buried after a ``` line.
  const cleaned = raw.replace(/^\s*```[a-z]*\s*\n/i, "").replace(/\n```\s*$/i, "");
  const m = extractMarkers(cleaned);

  const titleBlock = must(m, "TITLE")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (titleBlock.length === 0) throw new Error("synthesis output has an empty [TITLE]");

  const chapters: Chapter[] = [];
  for (const i of chapterNumbers(m)) {
    const title = m.get(`CH${i}_TITLE`);
    const body = m.get(`CH${i}_BODY`);
    if (!title && !body) continue;
    chapters.push({
      num: m.get(`CH${i}_NUM`) ?? String(i).padStart(2, "0"),
      title: title ?? "",
      body: body ?? "",
      nugget: m.get(`CH${i}_NUGGET`) ?? "",
    });
  }
  if (chapters.length === 0) throw new Error("synthesis output produced no chapters");

  return {
    title: titleBlock[0],
    subtitle: titleBlock.slice(1).join(" "),
    opening: must(m, "OPENING"),
    chapters,
    closing: must(m, "CLOSING"),
  };
}
