import assert from "node:assert/strict";
import test from "node:test";
import { libraryKey, localLibrary } from "../lib/local-library.ts";

test("local repository reloads a paused book, writes a resumed session, and preserves unreadable data", async (context) => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    },
  });
  context.after(() => { Reflect.deleteProperty(globalThis, "window"); });
  const id = "test-book";
  await localLibrary.apply({
    kind: "add", id, fields: { title: "A New Shelf", author: "Avery Wells", status: "reading", chapter: "Chapter 2", notes: "A bookmark" },
  });
  await localLibrary.apply({ kind: "status", id, status: "paused" });
  const reloaded = await localLibrary.load();
  const paused = reloaded.books.find((book) => book.id === id);
  assert.equal(paused?.status, "paused");
  assert.equal(paused?.chapter, "Chapter 2");
  assert.equal(paused?.notes, "A bookmark");

  await localLibrary.apply({
    kind: "log", id, sessionId: "test-session", readAt: "2026-11-06T19:00:00.000Z",
    progress: { chapter: "Chapter 3" }, notes: "Picked it back up",
  });
  const resumed = await localLibrary.load();
  assert.equal(resumed.books.find((book) => book.id === id)?.status, "reading");
  assert.equal(resumed.sessions.find((session) => session.bookId === id)?.chapter, "Chapter 3");

  const recovery = await localLibrary.recovery();
  assert.ok(recovery);
  const undone = await localLibrary.undo(recovery.id);
  assert.equal(undone.books.find(book => book.id === id)?.status, "paused");
  assert.equal(undone.books.find(book => book.id === id)?.chapter, "Chapter 2");
  assert.equal(undone.sessions.length, reloaded.sessions.length);
  assert.equal(await localLibrary.recovery(), null);
  assert.deepEqual(await localLibrary.load(), undone);

  await localLibrary.apply({ kind: "status", id, status: "finished" });
  const stalePoint = await localLibrary.recovery();
  assert.ok(stalePoint);
  await localLibrary.apply({ kind: "status", id, status: "reading" });
  await assert.rejects(localLibrary.undo(stalePoint.id), /library changed/);
  assert.equal((await localLibrary.load()).books.find(book => book.id === id)?.status, "reading");

  const beforeFailure = values.get(libraryKey);
  const originalSet = window.localStorage.setItem;
  window.localStorage.setItem = () => { throw new Error("Quota exceeded"); };
  await assert.rejects(localLibrary.apply({ kind: "status", id, status: "finished" }), /couldn’t be saved/);
  assert.equal(values.get(libraryKey), beforeFailure);
  window.localStorage.setItem = originalSet;

  const beforeSync = await localLibrary.load();
  await assert.rejects(localLibrary.exchange(async () => { throw new Error("Offline"); }), /Offline/);
  assert.deepEqual(await localLibrary.load(), beforeSync);
  await localLibrary.exchange(async (library) => ({ library, anchor: { userId: "fictional-user", revision: 1, library } }));
  await localLibrary.apply({ kind: "status", id, status: "finished" });
  assert.equal((await localLibrary.anchor())?.revision, 1);
  const syncedPoint = await localLibrary.recovery(); assert.ok(syncedPoint);
  await localLibrary.undo(syncedPoint.id);
  assert.equal((await localLibrary.anchor())?.userId, "fictional-user");

  // A fallback browser without Web Locks must not overwrite an intervening write.
  await assert.rejects(localLibrary.exchange(async (library, anchor) => {
    values.set(libraryKey, JSON.stringify({ ...library, books: [] }));
    assert.ok(anchor);
    return { library, anchor };
  }), /changed during sync/);
  assert.equal((await localLibrary.load()).books.length, 0);

  values.set(libraryKey, "{ unreadable");
  await assert.rejects(localLibrary.load(), /stored data was left in place/);
  await assert.rejects(localLibrary.apply({ kind: "status", id, status: "finished" }), /stored data was left in place/);
  assert.equal(values.get(libraryKey), "{ unreadable");
});
