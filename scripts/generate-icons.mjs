// Single source of truth for the favicon / app-icon assets. The Soothly mark (a voice waveform
// resolving into written lines) is defined once here and rasterized into every icon size, so the
// tab favicon, the apple-touch icon, and the PWA icons all stay of-a-piece. Run: node scripts/generate-icons.mjs
// (The OpenGraph / Twitter social cards are a separate composition and are NOT regenerated here.)
// Relies on `sharp`, already present as a transitive dependency via Next.js image optimization.
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const CANVAS = "#F2E7D1"; // warm cream icon field
const BRAND = "#C2674B"; // terracotta — the spoken waveform
const INK = "#34302A"; // ink — the written lines

// The mark's seven strokes, in a 100x100 space. Their tight bounding box (round caps included) is
// x[19.5..84.5] y[31.5..68.5] — a 65x37 box centered at (52, 50).
const STROKES = [
  { c: BRAND, d: "M22,41 L22,59" },
  { c: BRAND, d: "M30,34 L30,66" },
  { c: BRAND, d: "M38,43 L38,57" },
  { c: BRAND, d: "M46,37 L46,63" },
  { c: INK, d: "M58,43 L80,43" },
  { c: INK, d: "M58,51 L75,51" },
  { c: INK, d: "M58,59 L82,59" },
];

// How much of the canvas width the mark fills. At scale s the mark spans 65*s units (of 100), so
// s=1.15 -> ~75% width; centering an s-scaled mark needs translate(50-52s, 50-50s).
const SCALE = 1.15;
const tx = (50 - 52 * SCALE).toFixed(2);
const ty = (50 - 50 * SCALE).toFixed(2);

function svg({ size, rounded }) {
  const rx = rounded ? 23 : 0;
  const paths = STROKES.map(
    (s) => `<path d="${s.d}" stroke="${s.c}" stroke-width="5" stroke-linecap="round" fill="none"></path>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" rx="${rx}" fill="${CANVAS}"></rect><g transform="translate(${tx},${ty}) scale(${SCALE})">${paths}</g></svg>`;
}

const png = (opts) => sharp(Buffer.from(svg(opts))).png();

// ICO container holding the given PNG buffers (ICO supports embedding PNGs directly).
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o);
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(e.buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.buf.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.buf)]);
}

async function main() {
  // Scalable favicon — rounded card, matches the in-tab look.
  await writeFile(join(ROOT, "app/icon.svg"), svg({ size: 512, rounded: true }));

  // Multi-size .ico for browsers that don't take the SVG.
  const icoSizes = [16, 32, 48];
  const icoBufs = await Promise.all(
    icoSizes.map(async (size) => ({ size, buf: await png({ size, rounded: true }).toBuffer() })),
  );
  await writeFile(join(ROOT, "app/favicon.ico"), buildIco(icoBufs));

  // Full-bleed square PNGs (apple-touch is masked by iOS; the 512 doubles as the PWA maskable icon).
  await png({ size: 180, rounded: false }).toFile(join(ROOT, "app/apple-icon.png"));
  await png({ size: 192, rounded: false }).toFile(join(ROOT, "public/icons/icon-192.png"));
  await png({ size: 512, rounded: false }).toFile(join(ROOT, "public/icons/icon-512.png"));

  console.log(`Icons regenerated at scale ${SCALE} (mark fills ~${Math.round(65 * SCALE)}% width).`);
}

main();
