import type { Library } from "./books.ts";
import { isLibrary } from "./library-data.ts";

export const maxBackupBytes = 5 * 1024 * 1024;

export function validateBackup(value: unknown): Library {
  if (!isLibrary(value)) throw new Error("Choose a valid Book Comeback library file (version 1).");
  const bookIds = new Set(value.books.map((book) => book.id));
  const sessionIds = new Set(value.sessions.map((session) => session.id));
  if (bookIds.size !== value.books.length || sessionIds.size !== value.sessions.length) {
    throw new Error("This backup contains duplicate identifiers.");
  }
  for (const book of value.books) {
    if (!book.id || book.id.length > 200 || !book.title.trim() || book.title.length > 120 ||
        !book.author.trim() || book.author.length > 100 || book.notes.length > 5000 ||
        (book.chapter?.length ?? 0) > 80 ||
        (book.page !== undefined && book.totalPages !== undefined && book.page > book.totalPages)) {
      throw new Error("This backup contains an invalid book or bookmark.");
    }
  }
  for (const session of value.sessions) {
    if (!session.id || session.id.length > 200 || !bookIds.has(session.bookId) ||
        !/^\d{4}-\d{2}-\d{2}T/.test(session.readAt) || (session.chapter?.length ?? 0) > 80) {
      throw new Error("This backup contains an invalid reading session.");
    }
  }
  // Copy only supported fields from the file.
  return {
    version: 1,
    books: value.books.map(({ id, title, author, status, notes, page, chapter, totalPages, lastRead, example }) =>
      ({ id, title, author, status, notes, page, chapter, totalPages, lastRead, example })),
    sessions: value.sessions.map(({ id, bookId, readAt, page, chapter }) =>
      ({ id, bookId, readAt, page, chapter })),
  };
}

export function parseBackup(text: string): Library {
  if (new TextEncoder().encode(text).byteLength > maxBackupBytes) {
    throw new Error("Choose a library file smaller than 5 MB.");
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("This file couldn’t be read. Choose a JSON library exported from Book Comeback.");
  }
  return validateBackup(value);
}

export function serializeBackup(library: Library) {
  return JSON.stringify(validateBackup(library), null, 2);
}

export function mergeLibrary(current: Library, incoming: Library): Library {
  const backup = validateBackup(incoming);
  const personalBooks = current.books.filter((book) => !book.example);
  const existingBookIds = new Set(personalBooks.map((book) => book.id));
  const books = [...personalBooks, ...backup.books.filter((book) => !existingBookIds.has(book.id))];
  const bookIds = new Set(books.map((book) => book.id));
  const sessions = current.sessions.filter((session) => bookIds.has(session.bookId));
  const existingSessions = new Map(sessions.map((session) => [session.id, session]));
  for (const session of backup.sessions) {
    const existing = existingSessions.get(session.id);
    if (existing && existing.bookId !== session.bookId) {
      throw new Error("This file has conflicting reading sessions. Your library was left in place.");
    }
    if (!existing) sessions.push(session);
  }
  return { version: 1, books, sessions };
}
