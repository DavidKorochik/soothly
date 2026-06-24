import type { Book } from "../../lib/synthesis/parse.ts";
import { DIMENSIONS } from "./rubric.ts";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replaceAll("\n", "<br>")}</p>`)
    .join("\n");
}

// A clean RTL reading view of one blinded book, with the rubric printed at the top so the rater can
// score without leaving the page. No model identity anywhere in the output.
export function renderBookHtml(book: Book, blindId: string): string {
  const rubric = DIMENSIONS.map(
    (d) => `<li><b>${esc(d.label)}</b> <span>(${esc(d.key)})</span> - ${esc(d.hint)}</li>`,
  ).join("\n");

  const chapters = book.chapters
    .map(
      (c) => `<section class="ch">
  <div class="num">${esc(c.num)}</div>
  <h2>${esc(c.title)}</h2>
  ${paragraphs(c.body)}
  ${c.nugget ? `<blockquote>${esc(c.nugget)}</blockquote>` : ""}
</section>`,
    )
    .join("\n");

  return `<!doctype html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(blindId)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: "Frank Ruhl Libre", Georgia, serif; max-width: 42rem; margin: 0 auto;
         padding: 2rem 1.5rem 6rem; line-height: 1.85; color: #1a1a1a; background: #faf8f4; }
  .id { font-family: ui-monospace, monospace; color: #888; font-size: .8rem; letter-spacing: .05em; }
  .rubric { background: #fff; border: 1px solid #e6e0d6; border-radius: .6rem; padding: 1rem 1.25rem;
            margin: 1rem 0 2.5rem; font-size: .85rem; line-height: 1.6; }
  .rubric h3 { margin: 0 0 .5rem; font-size: .9rem; }
  .rubric ul { margin: 0; padding-inline-start: 1.1rem; }
  .rubric span { font-family: ui-monospace, monospace; color: #b0894a; font-size: .75rem; }
  h1 { font-size: 2rem; margin: .25rem 0 .25rem; }
  .subtitle { color: #6b6b6b; font-size: 1.05rem; margin-bottom: 2.5rem; }
  .ch { margin: 2.5rem 0; }
  .num { font-family: ui-monospace, monospace; color: #b0894a; font-size: .8rem; }
  h2 { font-size: 1.4rem; margin: .2rem 0 1rem; }
  blockquote { border-inline-start: 3px solid #b0894a; margin: 1.5rem 0; padding-inline-start: 1rem;
               color: #4a4a4a; font-style: italic; }
  .opening, .closing { color: #333; }
  hr { border: none; border-top: 1px solid #e6e0d6; margin: 3rem 0; }
</style>
</head>
<body>
  <div class="id">${esc(blindId)}</div>
  <div class="rubric">
    <h3>דירוג 1-5 לכל מימד (מלאו ב-scoresheet.csv לפי ה-blind id למעלה)</h3>
    <ul>${rubric}</ul>
  </div>
  <h1>${esc(book.title)}</h1>
  ${book.subtitle ? `<div class="subtitle">${esc(book.subtitle)}</div>` : ""}
  <div class="opening">${paragraphs(book.opening)}</div>
  <hr>
  ${chapters}
  <hr>
  <div class="closing">${paragraphs(book.closing)}</div>
</body>
</html>`;
}
