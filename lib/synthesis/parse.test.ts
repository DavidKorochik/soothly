import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBook } from "./parse.ts";

const WELL_FORMED = `
[TITLE]
הרעש שמתחת לשקט
דפוסים והדברים שלמדת על עצמך

[OPENING]
פסקה ראשונה של הפתיחה.

פסקה שנייה.

[CH1_NUM] 01
[CH1_TITLE] המנוע שקראת לו חוסר שקט
[CH1_BODY] גוף הפרק הראשון, פסקה אחת.

פסקה שנייה של הפרק.
[CH1_NUGGET] זה הזהב של פרק אחד.

[CH2_NUM] 02
[CH2_TITLE] מה שעשית כשאף אחד לא ביקש
[CH2_BODY] גוף הפרק השני.
[CH2_NUGGET] הזהב של פרק שתיים.

[CLOSING]
פסקת סיום.
`;

test("parseBook: title and subtitle split on the first line", () => {
  const book = parseBook(WELL_FORMED);
  assert.equal(book.title, "הרעש שמתחת לשקט");
  assert.equal(book.subtitle, "דפוסים והדברים שלמדת על עצמך");
});

test("parseBook: parses every chapter with its parts", () => {
  const book = parseBook(WELL_FORMED);
  assert.equal(book.chapters.length, 2);
  assert.equal(book.chapters[0].num, "01");
  assert.equal(book.chapters[0].title, "המנוע שקראת לו חוסר שקט");
  assert.match(book.chapters[0].body, /פסקה שנייה של הפרק/);
  assert.equal(book.chapters[1].nugget, "הזהב של פרק שתיים.");
});

test("parseBook: keeps multi-paragraph bodies intact", () => {
  const book = parseBook(WELL_FORMED);
  assert.ok(book.opening.includes("\n"));
  assert.ok(book.chapters[0].body.includes("\n"));
});

const MISSING_CLOSING = `
[TITLE]
כותרת
[CH1_TITLE] פרק
[CH1_BODY] גוף
[CH1_NUGGET] זהב
`;

const NO_CHAPTERS = `
[TITLE]
כותרת
[OPENING]
פתיחה
[CLOSING]
סיום
`;

for (const [name, raw] of [
  ["missing [CLOSING]", MISSING_CLOSING],
  ["no chapters", NO_CHAPTERS],
] as const) {
  test(`parseBook: throws on ${name}`, () => {
    assert.throws(() => parseBook(raw));
  });
}
