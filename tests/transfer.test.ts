import assert from "node:assert/strict";
import test from "node:test";
import type { Library } from "../lib/books.ts";
import { exampleLibrary } from "../lib/examples.ts";
import { mergeLibrary, parseBackup, serializeBackup } from "../lib/transfer.ts";

const library: Library = {
  version: 1,
  books: [{ id: "book-one", title: "A Small Journey", author: "Alex Reed", status: "paused", notes: "Return to the garden.", page: 12 }],
  sessions: [{ id: "session-one", bookId: "book-one", readAt: "2026-11-07T12:00:00.000Z", page: 12 }],
};

test("backup round trip preserves bookmarks, notes, and session history", () => {
  assert.deepEqual(JSON.parse(serializeBackup(parseBackup(serializeBackup(library)))), library);
});

test("import replaces examples, preserves newer local books, and is idempotent", () => {
  const first = mergeLibrary(exampleLibrary(), library);
  assert.equal(first.books.length, 1);
  first.books[0].page = 20;
  const repeated = mergeLibrary(first, parseBackup(serializeBackup(library)));
  assert.equal(repeated.books[0].page, 20);
  assert.equal(repeated.sessions.length, 1);
  assert.equal(repeated.books.length, 1);
});

test("invalid backups, duplicate IDs, orphan sessions, and invalid progress are rejected", () => {
  for (const data of [
    "{",
    JSON.stringify({ ...library, version: 2 }),
    JSON.stringify({ ...library, books: [...library.books, ...library.books] }),
    JSON.stringify({ ...library, sessions: [{ ...library.sessions[0], bookId: "missing" }] }),
    JSON.stringify({ ...library, books: [{ ...library.books[0], totalPages: 5 }] }),
    JSON.stringify({ ...library, books: [{ ...library.books[0], title: "" }] }),
  ]) {
    assert.throws(() => parseBackup(data));
  }
});

test("session identifier conflicts fail without changing the current library", () => {
  const other: Library = {
    version: 1,
    books: [{ ...library.books[0], id: "book-two" }],
    sessions: [{ ...library.sessions[0], bookId: "book-two" }],
  };
  const before = JSON.stringify(library);
  assert.throws(() => mergeLibrary(library, other), /conflicting/);
  assert.equal(JSON.stringify(library), before);
});
