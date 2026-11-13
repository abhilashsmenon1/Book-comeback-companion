import type { Library } from "./books.ts";
import { validateBackup } from "./transfer.ts";

export interface CloudState { revision: number; library: Library }
export interface SyncAnchor extends CloudState { userId: string }
export function personalLibrary(library: Library): Library {
  const books = library.books.filter(book => !book.example);
  const ids = new Set(books.map(book => book.id));
  return { version: 1, books, sessions: library.sessions.filter(session => ids.has(session.bookId)) };
}
export function sameData(a: unknown, b: unknown): boolean {
  function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
      .filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
    return value;
  }
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

export class SyncConflict extends Error {
  constructor() { super("Both devices changed the same book. Choose which library to keep in Sync & backup. Neither version has been overwritten."); }
}

export function mergeChanges(base: Library, local: Library, remote: Library): Library {
  function merge<T extends { id: string }>(before: T[], here: T[], there: T[]): T[] {
    const old = new Map(before.map(v => [v.id, v]));
    const left = new Map(here.map(v => [v.id, v]));
    const right = new Map(there.map(v => [v.id, v]));
    const result: T[] = [];
    for (const id of new Set([...old.keys(), ...left.keys(), ...right.keys()])) {
      const a = old.get(id), b = left.get(id), c = right.get(id);
      if (!sameData(a, b) && !sameData(a, c) && !sameData(b, c)) throw new SyncConflict();
      const value = sameData(a, b) ? c : b;
      if (value) result.push(value);
    }
    return result;
  }
  const books = merge(base.books, local.books, remote.books);
  const ids = new Set(books.map(book => book.id));
  const sessions = merge(base.sessions, local.sessions, remote.sessions).filter(session => ids.has(session.bookId));
  return validateBackup({ version: 1, books, sessions });
}
