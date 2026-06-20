import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHtml } from "./template.ts";
import type { Book } from "../synthesis/parse.ts";

const book: Book = {
  title: "הרעש שמתחת לשקט",
  subtitle: "תת כותרת",
  opening: "פסקה ראשונה.\n\nפסקה שנייה.",
  chapters: [
    { num: "01", title: "פרק ראשון", body: "גוף עם <תו> מסוכן & תו.", nugget: "זהב ראשון" },
    { num: "02", title: "פרק שני", body: "גוף שני.", nugget: "" },
  ],
  closing: "סיום.",
};

test("buildHtml: renders an RTL Hebrew document with all content", () => {
  const html = buildHtml(book, "נועה");
  assert.match(html, /<html lang="he" dir="rtl">/);
  assert.ok(html.includes(book.title));
  assert.ok(html.includes("לנועה"));
  for (const c of book.chapters) assert.ok(html.includes(c.title));
  assert.ok(html.includes("זהב ראשון"));
  assert.ok(html.includes("סיום."));
});

test("buildHtml: escapes HTML in synthesized text", () => {
  const html = buildHtml(book, "נועה");
  assert.ok(html.includes("&lt;תו&gt;"));
  assert.ok(html.includes("&amp;"));
  assert.ok(!html.includes("<תו>"));
});

test("buildHtml: pulls the stylesheet from book_template.html", () => {
  const html = buildHtml(book, "נועה");
  assert.ok(html.includes("Frank Ruhl Libre")); // proves the designer's <head> was inlined
});
