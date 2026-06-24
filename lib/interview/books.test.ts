import { test } from "node:test";
import assert from "node:assert/strict";
import { addBook, parseBooks, type SavedBook } from "./books.ts";

const book = (url: string, extra: Partial<SavedBook> = {}): SavedBook => ({
  name: "דנה",
  url,
  createdAt: 1,
  ...extra,
});

test("addBook prepends the newest book first", () => {
  const list = addBook(addBook([], book("/api/book/a")), book("/api/book/b"));
  assert.deepEqual(list.map((b) => b.url), ["/api/book/b", "/api/book/a"]);
});

test("addBook drops a prior entry with the same url instead of duplicating it", () => {
  const list = addBook([book("/api/book/a"), book("/api/book/b")], book("/api/book/a"));
  assert.deepEqual(list.map((b) => b.url), ["/api/book/a", "/api/book/b"]);
});

test("addBook caps the library length", () => {
  let list: SavedBook[] = [];
  for (let i = 0; i < 60; i++) list = addBook(list, book(`/api/book/${i}`));
  assert.equal(list.length, 50);
  assert.equal(list[0].url, "/api/book/59");
});

test("parseBooks returns an empty list for null, corrupt, or non-array input", () => {
  assert.deepEqual(parseBooks(null), []);
  assert.deepEqual(parseBooks("not json"), []);
  assert.deepEqual(parseBooks(JSON.stringify({ url: "/x" })), []);
});

test("parseBooks keeps only well-formed entries", () => {
  const raw = JSON.stringify([book("/api/book/a"), { name: "x" }, { url: "/y", name: "z", createdAt: 2 }]);
  assert.deepEqual(parseBooks(raw).map((b) => b.url), ["/api/book/a", "/y"]);
});
