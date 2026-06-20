export type Chapter = { num: string; title: string; body: string; nugget: string };

export type Book = {
  title: string;
  subtitle: string;
  opening: string;
  chapters: Chapter[];
  closing: string;
};

// The synthesis prompt emits sections tagged with [MARKER] tokens (see docs/synthesis_prompt_v2.md).
// Split the text at each marker and map marker -> the text up to the next marker.
function extractMarkers(raw: string): Map<string, string> {
  const re = /\[([A-Z0-9_]+)\]/g;
  const hits: { name: string; contentStart: number; markerStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
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

export function parseBook(raw: string): Book {
  const m = extractMarkers(raw);

  const titleBlock = must(m, "TITLE")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (titleBlock.length === 0) throw new Error("synthesis output has an empty [TITLE]");

  const chapters: Chapter[] = [];
  for (let i = 1; ; i++) {
    const title = m.get(`CH${i}_TITLE`);
    const body = m.get(`CH${i}_BODY`);
    if (!title && !body) break;
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
