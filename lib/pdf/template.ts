import fs from "node:fs";
import path from "node:path";
import type { Book, Chapter } from "../synthesis/parse";

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
  return `<section class="page cover"><div class="frame">
  <div class="occasion">ספר אישי</div>
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
  <div class="folio">·</div>
</section>`;
}

function chapter(c: Chapter): string {
  const body = paragraphs(c.body).map((p) => `<p>${esc(p)}</p>`).join("\n  ");
  const nugget = c.nugget
    ? `<div class="nugget"><span class="label">הזהב</span><span class="line">${esc(c.nugget)}</span></div>`
    : "";
  return `<section class="page chapter">
  <div class="ch-head"><span class="ch-num">${esc(c.num)}</span><h2 class="ch-title">${esc(c.title)}</h2></div>
  <div class="ch-rule"></div>
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
