import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAnswers, SKIP_MARKER, type InterviewMessage } from "./answers.ts";

test("buildAnswers pairs each answer with its preceding question", () => {
  const messages: InterviewMessage[] = [
    { role: "assistant", content: "מה קורה איתך עכשיו?" },
    { role: "user", content: "אני בתקופה של שינוי." },
    { role: "assistant", content: "ספר לי על השינוי." },
    { role: "user", content: "עברתי דירה." },
  ];
  assert.equal(
    buildAnswers(messages),
    "ש: מה קורה איתך עכשיו?\nת: אני בתקופה של שינוי.\n\nש: ספר לי על השינוי.\nת: עברתי דירה.",
  );
});

test("buildAnswers drops skipped questions", () => {
  const messages: InterviewMessage[] = [
    { role: "assistant", content: "שאלה ראשונה" },
    { role: "user", content: SKIP_MARKER },
    { role: "assistant", content: "שאלה שנייה" },
    { role: "user", content: "תשובה אמיתית" },
  ];
  assert.equal(buildAnswers(messages), "ש: שאלה שנייה\nת: תשובה אמיתית");
});

test("buildAnswers falls back to the bare answer when there is no preceding question", () => {
  const messages: InterviewMessage[] = [{ role: "user", content: "תשובה בלי שאלה" }];
  assert.equal(buildAnswers(messages), "תשובה בלי שאלה");
});

test("buildAnswers returns empty string when every answer is a skip", () => {
  const messages: InterviewMessage[] = [
    { role: "assistant", content: "שאלה" },
    { role: "user", content: SKIP_MARKER },
  ];
  assert.equal(buildAnswers(messages), "");
});

test("buildAnswers never uses a surfaced error message as a question", () => {
  const messages: InterviewMessage[] = [
    { role: "assistant", content: "שאלה ראשונה" },
    { role: "user", content: "תשובה ראשונה" },
    { role: "assistant", content: "משהו השתבש בשליחה. אפשר לנסות שוב.", error: true },
    { role: "user", content: "תשובה אחרי שגיאה" },
  ];
  assert.equal(
    buildAnswers(messages),
    "ש: שאלה ראשונה\nת: תשובה ראשונה\n\nתשובה אחרי שגיאה",
  );
});
