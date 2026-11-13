import assert from "node:assert/strict";
import test from "node:test";
import type { Library } from "../lib/books.ts";
import { changeLibrary } from "../lib/library.ts";
import { braveMusicLink, currentBook, musicLink, notionPageLink, notesForNotion, readingSeconds, readingShortcutLink, readingShortcutName } from "../lib/reading.ts";

const library: Library = { version: 1, sessions: [], books: [
  { id: "fiction", title: "Quiet River", author: "A. Writer", status: "paused", page: 42, notes: "An idea to revisit." },
] };

test("iPhone shortcut receives one encoded Brave link and Notion links are restricted", () => {
  const track = "https://www.youtube.com/watch?v=fiction&t=30";
  const shortcut = new URL(readingShortcutLink(track));
  assert.equal(shortcut.protocol, "shortcuts:");
  assert.equal(shortcut.hostname, "run-shortcut");
  assert.equal(shortcut.searchParams.get("name"), readingShortcutName);
  assert.equal(shortcut.searchParams.get("input"), "text");
  assert.equal(shortcut.searchParams.get("text"), braveMusicLink(track));
  assert.equal(notionPageLink("https://www.notion.so/example"), "https://www.notion.so/example");
  assert.throws(() => notionPageLink("https://notion.so.evil.example"));
  assert.throws(() => notionPageLink("javascript:alert(1)"));
});

test("notes autosave preserves existing progress and rejects stale overwrites", () => {
  const saved = changeLibrary(library, { kind: "notes", id: "fiction", expected: "An idea to revisit.", notes: "A new thought." });
  assert.equal(saved.books[0].page, 42);
  assert.equal(saved.books[0].status, "paused");
  assert.throws(() => changeLibrary(saved, { kind: "notes", id: "fiction", expected: "An idea to revisit.", notes: "Stale text" }));
  const reopened: Library = JSON.parse(JSON.stringify(saved));
  const resumed = changeLibrary(reopened, { kind: "log", id: "fiction", sessionId: "session", readAt: "2026-11-10T12:00:00Z", progress: { page: 48 } });
  assert.equal(resumed.books[0].notes, "A new thought.");
  assert.equal(resumed.books[0].page, 48);
  assert.equal(resumed.books[0].status, "reading");
  assert.equal(resumed.sessions.length, 1);
});

test("mobile YouTube links route through Brave without losing video parameters", () => {
  const mobile = "https://m.youtube.com/watch?v=example&t=45&list=reading";
  const canonical = "https://www.youtube.com/watch?v=example&t=45&list=reading";
  assert.equal(musicLink(mobile), canonical);
  const brave = new URL(braveMusicLink(mobile));
  assert.equal(brave.protocol, "brave:");
  assert.equal(brave.hostname, "open-url");
  assert.equal(brave.searchParams.get("url"), canonical);
  assert.equal([...brave.searchParams].length, 1);
  assert.equal(braveMusicLink(""), "");
  assert.throws(() => braveMusicLink("https://m.youtube.com.evil.example/watch"));
  assert.throws(() => braveMusicLink("https://user:password@youtube.com/watch"));
});

test("reading home selects personal current books and music accepts only HTTPS YouTube", () => {
  const personal = { ...library.books[0], id: "reading", status: "reading" as const };
  assert.equal(currentBook({ ...library, books: [...library.books, personal] })?.id, "reading");
  assert.equal(readingSeconds, 900);
  assert.equal(musicLink("https://youtu.be/example"), "https://youtu.be/example");
  assert.throws(() => musicLink("javascript:alert(1)"));
  assert.throws(() => musicLink("https://youtube.com.evil.example"));
  assert.match(notesForNotion(personal), /An idea to revisit\./);
});
