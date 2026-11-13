import assert from "node:assert/strict";
import test from "node:test";
import type { Library } from "../lib/books.ts";
import { mergeChanges, personalLibrary, sameData, SyncConflict } from "../lib/sync.ts";

const base: Library = { version: 1, books: [
  { id: "a", title: "Quiet River", author: "A. Writer", notes: "", status: "reading", page: 20 },
  { id: "b", title: "A Winter Garden", author: "B. Writer", notes: "", status: "paused", page: 10 },
], sessions: [] };
const copy = () => structuredClone(base);

test("sync merges different-book edits and retains both reading sessions", () => {
  const local = copy(), remote = copy();
  local.books[0].page = 30; remote.books[1].page = 12;
  local.sessions.push({ id: "left", bookId: "a", page: 30, readAt: "2026-11-12T12:00:00Z" });
  remote.sessions.push({ id: "right", bookId: "b", page: 12, readAt: "2026-11-12T12:00:01Z" });
  const merged = mergeChanges(base, local, remote);
  assert.equal(merged.books[0].page, 30); assert.equal(merged.books[1].page, 12);
  assert.equal(merged.sessions.length, 2);
});
test("same-book conflicts and delete-versus-edit never silently overwrite", () => {
  const local = copy(), remote = copy();
  local.books[0].page = 30; remote.books[0].page = 40;
  assert.throws(() => mergeChanges(base, local, remote), SyncConflict);
  remote.books = remote.books.filter(book => book.id !== "a");
  assert.throws(() => mergeChanges(base, local, remote), SyncConflict);
  assert.equal(base.books[0].page, 20);
});
test("unchanged devices accept remote deletions; samples do not enter cloud migration", () => {
  const remote = copy(); remote.books = [];
  assert.equal(mergeChanges(base, copy(), remote).books.length, 0);
  const sample = copy(); sample.books[0].example = true;
  sample.sessions.push({ id: "demo", bookId: "a", readAt: "2026-11-12T12:00:00Z" });
  assert.equal(personalLibrary(sample).books.length, 1);
  assert.equal(personalLibrary(sample).sessions.length, 0);
  assert.ok(sameData({ page: 3, notes: "", chapter: undefined }, { notes: "", page: 3 }));
});
