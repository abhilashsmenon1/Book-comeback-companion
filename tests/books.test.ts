import assert from "node:assert/strict";
import test from "node:test";
import { positionLabel, progressPercent, readingStats, validateBook } from "../lib/books.ts";
import type { BookFields, BookInput, Library } from "../lib/books.ts";
import { changeLibrary } from "../lib/library.ts";

const input: BookInput = {
  title: " The Lanterns of Low Tide ", author: " Mara Ellery ", page: "", totalPages: "",
  chapter: "", lastRead: "", status: "want", notes: "",
};

test("accepts a chapter-only bookmark and trims the fields", () => {
  const result = validateBook({ ...input, chapter: " Chapter 6 " });
  assert.ok("value" in result);
  assert.equal(result.value.title, "The Lanterns of Low Tide");
  assert.equal(result.value.author, "Mara Ellery");
  assert.equal(positionLabel(result.value), "Chapter 6");
  assert.equal(progressPercent(result.value), null);
});

test("rejects missing names, invalid status, and future or impossible dates", () => {
  const invalid = validateBook({ ...input, title: "  ", author: "", status: "unknown", lastRead: "2026-11-07" }, "2026-11-06");
  assert.ok("errors" in invalid);
  assert.deepEqual(Object.keys(invalid.errors).sort(), ["author", "lastRead", "status", "title"]);
  assert.ok("errors" in validateBook({ ...input, lastRead: "2026-02-30" }, "2026-11-06"));
  assert.ok("value" in validateBook({ ...input, lastRead: "2024-02-29" }, "2026-11-06"));
});

test("validates whole page numbers and the page limit", () => {
  for (const page of ["0", "-1", "1.5", "1e2", "9007199254740992"]) {
    assert.ok("errors" in validateBook({ ...input, page }), page);
  }
  const result = validateBook({ ...input, page: "101", totalPages: "100" });
  assert.ok("errors" in result);
  assert.equal(result.errors.page, "Current page can’t exceed the total pages.");
  assert.ok("errors" in validateBook({ ...input, totalPages: "0" }));
});

test("computes page-based progress, preserves a manual finish, and formats both markers", () => {
  const book: BookFields = { title: "Title", author: "Author", notes: "", status: "reading", page: 51, totalPages: 200, chapter: "Chapter 3" };
  assert.equal(progressPercent(book), 26);
  assert.equal(progressPercent({ ...book, status: "finished", page: undefined }), 100);
  assert.equal(positionLabel(book), "Page 51 · Chapter 3");
  assert.equal(positionLabel({}), "No position saved");
});

test("adds a book, saves a pause across serialization, and resumes in one session", () => {
  const empty: Library = { version: 1, books: [], sessions: [] };
  const fields: BookFields = { title: "Title", author: "Author", status: "reading", notes: "An earlier note", page: 12, totalPages: 120 };
  const added = changeLibrary(empty, { kind: "add", id: "book", fields });
  const paused = changeLibrary(added, { kind: "status", id: "book", status: "paused" });
  const saved = JSON.parse(JSON.stringify(paused)) as Library;
  assert.equal(saved.books[0].status, "paused");
  assert.equal(saved.books[0].notes, "An earlier note");
  const readAt = new Date(2026, 10, 6, 12).toISOString();
  const log = { kind: "log", id: "book", sessionId: "session", readAt, progress: { page: 16 }, notes: "A new note" } as const;
  const resumed = changeLibrary(saved, log);
  assert.equal(resumed.books[0].status, "reading");
  assert.equal(resumed.books[0].notes, "A new note");
  assert.equal(resumed.books[0].lastRead, "2026-11-06");
  assert.equal(resumed.sessions[0].page, 16);
  assert.equal(changeLibrary(resumed, log).sessions.length, 1);
  const finished = changeLibrary(resumed, { kind: "status", id: "book", status: "finished" });
  assert.equal(finished.books[0].page, 16);
  assert.equal(finished.sessions.length, 1);
  assert.throws(() => changeLibrary(saved, { ...log, progress: { page: 121 } }), /total pages changed/);
  assert.deepEqual(changeLibrary(resumed, { kind: "remove", id: "book" }), empty);
});

test("counts sessions from local Monday through the current instant", () => {
  const now = new Date(2026, 10, 4, 13);
  const dates = [new Date(2026, 10, 1, 23, 59), new Date(2026, 10, 2), now, new Date(2026, 10, 4, 14)];
  const library: Library = {
    version: 1,
    books: (["reading", "paused", "finished", "want"] as const).map((status) => ({ id: status, title: status, author: "Author", notes: "", status })),
    sessions: dates.map((date, index) => ({ id: String(index), bookId: "reading", readAt: date.toISOString() })),
  };
  assert.deepEqual(readingStats(library, now), { reading: 1, paused: 1, finished: 1, sessions: 2 });
});
