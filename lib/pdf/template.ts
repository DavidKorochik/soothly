import fs from "node:fs";
import path from "node:path";
import type { Book, Chapter } from "../synthesis/parse";

// --- Botanical ornaments (inlined; kept here rather than a sibling module so template.ts has no
// relative value import — its node test loads it directly, and bare node can't resolve an
// extensionless TS import). Same almond-bough motif as app/components/BotanicalSprig.tsx,
// regenerated as static SVG via .context/gen-sprig.ts. Colors are the book's CSS vars; faintness
// is set in CSS. Inline SVG always prints (it is content, not a CSS background). ---
const BOUGH_G = `<path d="M206 206 C176 180 162 156 150 126 C138 96 120 62 94 34" fill="none" stroke="var(--gold)" stroke-width="2.4" stroke-linecap="round"/><path d="M150 126 C163 112 183 108 200 92" fill="none" stroke="var(--gold-line)" stroke-width="1.3" stroke-linecap="round"/><path d="M134 92 C120 78 100 76 82 62" fill="none" stroke="var(--gold-line)" stroke-width="1.3" stroke-linecap="round"/><path d="M112 56 C104 44 90 38 76 30" fill="none" stroke="var(--gold-line)" stroke-width="1.3" stroke-linecap="round"/><path d="M176.0 110.0 C180.4 118.3 194.5 121.0 200.0 120.0 C196.8 115.4 185.0 107.3 176.0 110.0 Z" fill="none" stroke="var(--sage)" stroke-width="1.1"/><path d="M176.0 110.0 L200.0 120.0" stroke="var(--sage)" stroke-width="0.7" opacity="0.8"/><path d="M168.0 120.0 C169.9 129.1 182.6 136.8 188.0 138.0 C186.2 132.7 177.3 121.0 168.0 120.0 Z" fill="none" stroke="var(--sage)" stroke-width="1.1"/><path d="M168.0 120.0 L188.0 138.0" stroke="var(--sage)" stroke-width="0.7" opacity="0.8"/><path d="M150.0 126.0 C140.5 127.6 133.0 140.4 132.0 146.0 C137.5 144.4 149.4 135.6 150.0 126.0 Z" fill="none" stroke="var(--sage)" stroke-width="1.1"/><path d="M150.0 126.0 L132.0 146.0" stroke="var(--sage)" stroke-width="0.7" opacity="0.8"/><path d="M96.0 62.0 C93.7 54.5 82.6 50.1 78.0 50.0 C79.9 54.2 88.2 62.8 96.0 62.0 Z" fill="none" stroke="var(--sage)" stroke-width="1.1"/><path d="M96.0 62.0 L78.0 50.0" stroke="var(--sage)" stroke-width="0.7" opacity="0.8"/><path d="M92.0 66.0 C83.6 66.7 75.6 77.3 74.0 82.0 C78.9 81.0 90.3 74.2 92.0 66.0 Z" fill="none" stroke="var(--sage)" stroke-width="1.1"/><path d="M92.0 66.0 L74.0 82.0" stroke="var(--sage)" stroke-width="0.7" opacity="0.8"/><path d="M120.0 80.0 C128.7 79.6 136.6 68.9 138.0 64.0 C132.9 64.8 121.4 71.4 120.0 80.0 Z" fill="none" stroke="var(--sage)" stroke-width="1.1"/><path d="M120.0 80.0 L138.0 64.0" stroke="var(--sage)" stroke-width="0.7" opacity="0.8"/><path d="M60.0 48.0 C61.5 45.1 58.6 42.9 56.9 42.5 C56.2 44.2 56.8 47.8 60.0 48.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M196.0 118.0 C198.7 119.4 200.9 116.7 201.2 115.0 C199.6 114.5 196.2 115.0 196.0 118.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><g><path d="M94.0 34.0 C100.0 30.4 97.0 23.3 94.0 21.0 C91.0 23.3 88.0 30.4 94.0 34.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M94.0 34.0 C92.4 27.2 84.8 27.9 81.6 30.0 C82.9 33.5 88.7 38.6 94.0 34.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M94.0 34.0 C87.0 33.4 85.3 40.9 86.4 44.5 C90.2 44.4 96.7 40.5 94.0 34.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M94.0 34.0 C91.3 40.5 97.8 44.4 101.6 44.5 C102.7 40.9 101.0 33.4 94.0 34.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M94.0 34.0 C99.3 38.6 105.1 33.5 106.4 30.0 C103.2 27.9 95.6 27.2 94.0 34.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M94.0 34.0 L97.3 28.4" stroke="var(--gold)" stroke-width="0.6"/><circle cx="97.3" cy="28.4" r="1.2" fill="var(--gold)"/><path d="M94.0 34.0 L91.8 27.9" stroke="var(--gold)" stroke-width="0.6"/><circle cx="91.8" cy="27.9" r="1.2" fill="var(--gold)"/><path d="M94.0 34.0 L87.9 31.8" stroke="var(--gold)" stroke-width="0.6"/><circle cx="87.9" cy="31.8" r="1.2" fill="var(--gold)"/><path d="M94.0 34.0 L91.8 40.1" stroke="var(--gold)" stroke-width="0.6"/><circle cx="91.8" cy="40.1" r="1.2" fill="var(--gold)"/><path d="M94.0 34.0 L97.3 39.6" stroke="var(--gold)" stroke-width="0.6"/><circle cx="97.3" cy="39.6" r="1.2" fill="var(--gold)"/><circle cx="94.0" cy="34.0" r="1.8" fill="none" stroke="var(--gold)" stroke-width="0.7"/></g><g><path d="M200.0 92.0 C204.4 89.3 202.2 84.2 200.0 82.5 C197.8 84.2 195.6 89.3 200.0 92.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M200.0 92.0 C198.8 87.0 193.3 87.5 191.0 89.1 C191.9 91.7 196.1 95.3 200.0 92.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M200.0 92.0 C194.9 91.6 193.7 97.0 194.4 99.7 C197.2 99.6 202.0 96.7 200.0 92.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M200.0 92.0 C198.0 96.7 202.8 99.6 205.6 99.7 C206.3 97.0 205.1 91.6 200.0 92.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M200.0 92.0 C203.9 95.3 208.1 91.7 209.0 89.1 C206.7 87.5 201.2 87.0 200.0 92.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M200.0 92.0 L202.4 87.9" stroke="var(--gold)" stroke-width="0.6"/><circle cx="202.4" cy="87.9" r="0.9" fill="var(--gold)"/><path d="M200.0 92.0 L198.4 87.5" stroke="var(--gold)" stroke-width="0.6"/><circle cx="198.4" cy="87.5" r="0.9" fill="var(--gold)"/><path d="M200.0 92.0 L195.5 90.4" stroke="var(--gold)" stroke-width="0.6"/><circle cx="195.5" cy="90.4" r="0.9" fill="var(--gold)"/><path d="M200.0 92.0 L198.4 96.5" stroke="var(--gold)" stroke-width="0.6"/><circle cx="198.4" cy="96.5" r="0.9" fill="var(--gold)"/><path d="M200.0 92.0 L202.4 96.1" stroke="var(--gold)" stroke-width="0.6"/><circle cx="202.4" cy="96.1" r="0.9" fill="var(--gold)"/><circle cx="200.0" cy="92.0" r="1.3" fill="none" stroke="var(--gold)" stroke-width="0.7"/></g><g><path d="M76.0 30.0 C80.6 27.2 78.3 21.8 76.0 20.0 C73.7 21.8 71.4 27.2 76.0 30.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M76.0 30.0 C74.8 24.8 68.9 25.3 66.5 26.9 C67.5 29.7 71.9 33.5 76.0 30.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M76.0 30.0 C70.6 29.6 69.3 35.3 70.1 38.1 C73.0 38.0 78.1 35.0 76.0 30.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M76.0 30.0 C73.9 35.0 79.0 38.0 81.9 38.1 C82.7 35.3 81.4 29.6 76.0 30.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M76.0 30.0 C80.1 33.5 84.5 29.7 85.5 26.9 C83.1 25.3 77.2 24.8 76.0 30.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M76.0 30.0 L78.5 25.7" stroke="var(--gold)" stroke-width="0.6"/><circle cx="78.5" cy="25.7" r="0.9" fill="var(--gold)"/><path d="M76.0 30.0 L74.3 25.3" stroke="var(--gold)" stroke-width="0.6"/><circle cx="74.3" cy="25.3" r="0.9" fill="var(--gold)"/><path d="M76.0 30.0 L71.3 28.3" stroke="var(--gold)" stroke-width="0.6"/><circle cx="71.3" cy="28.3" r="0.9" fill="var(--gold)"/><path d="M76.0 30.0 L74.3 34.7" stroke="var(--gold)" stroke-width="0.6"/><circle cx="74.3" cy="34.7" r="0.9" fill="var(--gold)"/><path d="M76.0 30.0 L78.5 34.3" stroke="var(--gold)" stroke-width="0.6"/><circle cx="78.5" cy="34.3" r="0.9" fill="var(--gold)"/><circle cx="76.0" cy="30.0" r="1.4" fill="none" stroke="var(--gold)" stroke-width="0.7"/></g><g><path d="M150.0 126.0 C153.9 123.6 152.0 119.0 150.0 117.5 C148.0 119.0 146.1 123.6 150.0 126.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M150.0 126.0 C148.9 121.5 144.0 122.0 141.9 123.4 C142.8 125.7 146.5 129.0 150.0 126.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M150.0 126.0 C145.4 125.6 144.3 130.5 145.0 132.9 C147.5 132.8 151.8 130.2 150.0 126.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M150.0 126.0 C148.2 130.2 152.5 132.8 155.0 132.9 C155.7 130.5 154.6 125.6 150.0 126.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M150.0 126.0 C153.5 129.0 157.2 125.7 158.1 123.4 C156.0 122.0 151.1 121.5 150.0 126.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M150.0 126.0 L152.1 122.3" stroke="var(--gold)" stroke-width="0.6"/><circle cx="152.1" cy="122.3" r="0.8" fill="var(--gold)"/><path d="M150.0 126.0 L148.5 122.0" stroke="var(--gold)" stroke-width="0.6"/><circle cx="148.5" cy="122.0" r="0.8" fill="var(--gold)"/><path d="M150.0 126.0 L146.0 124.5" stroke="var(--gold)" stroke-width="0.6"/><circle cx="146.0" cy="124.5" r="0.8" fill="var(--gold)"/><path d="M150.0 126.0 L148.5 130.0" stroke="var(--gold)" stroke-width="0.6"/><circle cx="148.5" cy="130.0" r="0.8" fill="var(--gold)"/><path d="M150.0 126.0 L152.1 129.7" stroke="var(--gold)" stroke-width="0.6"/><circle cx="152.1" cy="129.7" r="0.8" fill="var(--gold)"/><circle cx="150.0" cy="126.0" r="1.2" fill="none" stroke="var(--gold)" stroke-width="0.7"/></g>`;

const ACCENT_G = `<path d="M8 96 C24 78 30 54 28 26" fill="none" stroke="var(--gold-line)" stroke-width="1.4" stroke-linecap="round"/><path d="M24.0 64.0 C21.5 56.9 10.5 52.3 6.0 52.0 C8.0 56.0 16.5 64.4 24.0 64.0 Z" fill="none" stroke="var(--sage)" stroke-width="1.1"/><path d="M24.0 64.0 L6.0 52.0" stroke="var(--sage)" stroke-width="0.7" opacity="0.8"/><path d="M26.0 48.0 C33.6 49.2 43.4 41.8 46.0 38.0 C41.4 37.8 29.6 41.2 26.0 48.0 Z" fill="none" stroke="var(--sage)" stroke-width="1.1"/><path d="M26.0 48.0 L46.0 38.0" stroke="var(--sage)" stroke-width="0.7" opacity="0.8"/><g><path d="M28.0 22.0 C31.7 19.8 29.8 15.4 28.0 14.0 C26.2 15.4 24.3 19.8 28.0 22.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M28.0 22.0 C27.0 17.8 22.3 18.2 20.4 19.5 C21.2 21.7 24.7 24.8 28.0 22.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M28.0 22.0 C23.7 21.6 22.7 26.2 23.3 28.5 C25.6 28.4 29.7 26.0 28.0 22.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M28.0 22.0 C26.3 26.0 30.4 28.4 32.7 28.5 C33.3 26.2 32.3 21.6 28.0 22.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M28.0 22.0 C31.3 24.8 34.8 21.7 35.6 19.5 C33.7 18.2 29.0 17.8 28.0 22.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M28.0 22.0 L30.0 18.5" stroke="var(--gold)" stroke-width="0.6"/><circle cx="30.0" cy="18.5" r="0.7" fill="var(--gold)"/><path d="M28.0 22.0 L26.6 18.2" stroke="var(--gold)" stroke-width="0.6"/><circle cx="26.6" cy="18.2" r="0.7" fill="var(--gold)"/><path d="M28.0 22.0 L24.2 20.6" stroke="var(--gold)" stroke-width="0.6"/><circle cx="24.2" cy="20.6" r="0.7" fill="var(--gold)"/><path d="M28.0 22.0 L26.6 25.8" stroke="var(--gold)" stroke-width="0.6"/><circle cx="26.6" cy="25.8" r="0.7" fill="var(--gold)"/><path d="M28.0 22.0 L30.0 25.5" stroke="var(--gold)" stroke-width="0.6"/><circle cx="30.0" cy="25.5" r="0.7" fill="var(--gold)"/><circle cx="28.0" cy="22.0" r="1.1" fill="none" stroke="var(--gold)" stroke-width="0.7"/></g>`;

const DIVIDER_G = `<path d="M14 20 L78 20" stroke="var(--gold-line)" stroke-width="1" stroke-linecap="round"/><path d="M122 20 L186 20" stroke="var(--gold-line)" stroke-width="1" stroke-linecap="round"/><path d="M78.0 20.0 C75.7 15.0 67.3 11.4 64.0 11.0 C65.7 13.9 72.5 20.0 78.0 20.0 Z" fill="none" stroke="var(--sage)" stroke-width="1.1"/><path d="M78.0 20.0 L64.0 11.0" stroke="var(--sage)" stroke-width="0.7" opacity="0.8"/><path d="M122.0 20.0 C127.5 20.0 134.3 13.9 136.0 11.0 C132.7 11.4 124.3 15.0 122.0 20.0 Z" fill="none" stroke="var(--sage)" stroke-width="1.1"/><path d="M122.0 20.0 L136.0 11.0" stroke="var(--sage)" stroke-width="0.7" opacity="0.8"/><g><path d="M100.0 20.0 C104.6 17.2 102.3 11.8 100.0 10.0 C97.7 11.8 95.4 17.2 100.0 20.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M100.0 20.0 C98.8 14.8 92.9 15.3 90.5 16.9 C91.5 19.7 95.9 23.5 100.0 20.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M100.0 20.0 C94.6 19.6 93.3 25.3 94.1 28.1 C97.0 28.0 102.1 25.0 100.0 20.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M100.0 20.0 C97.9 25.0 103.0 28.0 105.9 28.1 C106.7 25.3 105.4 19.6 100.0 20.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M100.0 20.0 C104.1 23.5 108.5 19.7 109.5 16.9 C107.1 15.3 101.2 14.8 100.0 20.0 Z" fill="none" stroke="var(--gold-line)" stroke-width="0.8"/><path d="M100.0 20.0 L102.5 15.7" stroke="var(--gold)" stroke-width="0.6"/><circle cx="102.5" cy="15.7" r="0.9" fill="var(--gold)"/><path d="M100.0 20.0 L98.3 15.3" stroke="var(--gold)" stroke-width="0.6"/><circle cx="98.3" cy="15.3" r="0.9" fill="var(--gold)"/><path d="M100.0 20.0 L95.3 18.3" stroke="var(--gold)" stroke-width="0.6"/><circle cx="95.3" cy="18.3" r="0.9" fill="var(--gold)"/><path d="M100.0 20.0 L98.3 24.7" stroke="var(--gold)" stroke-width="0.6"/><circle cx="98.3" cy="24.7" r="0.9" fill="var(--gold)"/><path d="M100.0 20.0 L102.5 24.3" stroke="var(--gold)" stroke-width="0.6"/><circle cx="102.5" cy="24.3" r="0.9" fill="var(--gold)"/><circle cx="100.0" cy="20.0" r="1.4" fill="none" stroke="var(--gold)" stroke-width="0.7"/></g>`;

const bough = (cls: string): string =>
  `<svg class="${cls}" viewBox="0 0 212 212" fill="none" stroke-linejoin="round" aria-hidden="true">${BOUGH_G}</svg>`;

const accent = (cls: string): string =>
  `<svg class="${cls}" viewBox="0 0 52 102" fill="none" stroke-linejoin="round" aria-hidden="true">${ACCENT_G}</svg>`;

const divider = (cls: string): string =>
  `<svg class="${cls}" viewBox="0 0 200 40" fill="none" stroke-linejoin="round" aria-hidden="true">${DIVIDER_G}</svg>`;


// Inline each self-hosted woff2 as a base64 data URL so the rendered PDF carries its own Hebrew
// glyphs. Prod renders on serverless Chromium (no system fonts) and the relative fonts/ paths don't
// resolve under setContent — without this the keepsake risks blank/tofu text. A missing file throws
// here (fail loud at build) rather than degrading to tofu silently.
function inlineFonts(css: string): string {
  // Match any self-hosted fonts/ url (not just .woff2) so an un-inlinable format fails loud here
  // rather than surviving as a relative path that silently 404s to tofu under setContent.
  return css.replace(/url\(\s*["']?fonts\/([^"')]+)["']?\s*\)/g, (_m, file: string) => {
    if (!file.endsWith(".woff2")) {
      throw new Error(`book_template.html: cannot embed font "${file}" — only .woff2 is inlined`);
    }
    const buf = fs.readFileSync(path.join(process.cwd(), "docs", "fonts", file));
    return `url(data:font/woff2;base64,${buf.toString("base64")})`;
  });
}

// Single-source the design: pull the <head> (fonts + full stylesheet) straight from the
// designer's book_template.html, and generate only the body sections from synthesized content.
let head: string | null = null;
function templateHead(): string {
  if (head) return head;
  const file = fs.readFileSync(path.join(process.cwd(), "docs", "book_template.html"), "utf8");
  const match = file.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (!match) throw new Error("book_template.html: <head> not found");
  return (head = inlineFonts(match[1]));
}

function esc(s: string): string {
  return s
    .replace(/[—–]/g, "-") // product copy uses a plain hyphen, never em/en dashes
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(text: string): string[] {
  const byBlank = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const parts = byBlank.length > 1 ? byBlank : text.split(/\n/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [text.trim()];
}

function cover(book: Book, name: string): string {
  return `<section class="page cover">
  ${accent("cover-accent")}
  ${bough("cover-bough")}
  <div class="frame">
  ${divider("ornament")}
  <h1>${esc(book.title)}</h1>
  ${book.subtitle ? `<p class="sub">${esc(book.subtitle)}</p>` : ""}
  <div class="mark"></div>
  <div class="name">ל${esc(name)}</div>
</div></section>`;
}

function opening(book: Book): string {
  const body = paragraphs(book.opening)
    .map((p, i) => `<p${i === 0 ? ' class="lead"' : ""}>${esc(p)}</p>`)
    .join("\n  ");
  return `<section class="page opening">
  <div class="eyebrow">פתח דבר</div>
  ${body}
  ${divider("ornament")}
  <div class="folio">·</div>
</section>`;
}

function chapter(c: Chapter): string {
  const body = paragraphs(c.body).map((p) => `<p>${esc(p)}</p>`).join("\n  ");
  const nugget = c.nugget
    ? `<div class="nugget"><span class="label">הזהב</span><span class="line">${esc(c.nugget)}</span></div>`
    : "";
  return `<section class="page chapter">
  ${bough("page-bough")}
  <div class="ch-head"><span class="ch-num">${esc(c.num)}</span><h2 class="ch-title">${esc(c.title)}</h2></div>
  ${divider("ch-flourish")}
  ${body}
  ${nugget}
  <div class="folio">${esc(c.num)}</div>
</section>`;
}

function closing(book: Book): string {
  const body = paragraphs(book.closing).map((p) => `<p>${esc(p)}</p>`).join("\n  ");
  return `<section class="page closing">
  <div class="eyebrow">ולסיום</div>
  ${body}
  ${divider("ornament")}
  <div class="folio">·</div>
</section>`;
}

export function buildHtml(book: Book, name: string): string {
  const sections = [
    cover(book, name),
    opening(book),
    ...book.chapters.map(chapter),
    closing(book),
  ].join("\n");
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>${templateHead()}</head>
<body>
${sections}
</body>
</html>`;
}
