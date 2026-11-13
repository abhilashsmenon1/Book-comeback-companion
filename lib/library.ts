import { localDate } from "./books.ts";
import type { Book, BookFields, BookStatus, Library, Progress } from "./books.ts";
import { mergeLibrary } from "./transfer.ts";

export type LibraryChange =
  | { kind: "import"; library: Library }
  | { kind: "notes"; id: string; notes: string; expected: string }
  | { kind: "add"; id: string; fields: BookFields }
  | { kind: "edit"; id: string; fields: BookFields }
  | { kind: "status"; id: string; status: BookStatus }
  | { kind: "remove"; id: string }
  | { kind: "log"; id: string; sessionId: string; readAt: string; progress: Progress; notes?: string };

export interface LibraryRepository {
  load(): Promise<Library>;
  apply(change: LibraryChange): Promise<Library>;
}

export function changeLibrary(library: Library, change: LibraryChange): Library {
  if (change.kind === "import") return mergeLibrary(library, change.library);
  if (change.kind === "add") {
    if (library.books.some((book) => book.id === change.id)) return library;
    return { ...library, books: [...library.books, { ...change.fields, id: change.id }] };
  }

  const book = library.books.find(({ id }) => id === change.id);
  if (!book) throw new Error("This book is no longer in your library.");
  if (change.kind === "notes") {
    if (book.notes !== change.expected) throw new Error("Notes changed in another window. Copy your draft before reloading to merge it.");
    if (change.notes.length > 5000) throw new Error("Keep notes to 5,000 characters.");
    return replaceBook(library, { ...book, notes: change.notes });
  }
  if (change.kind === "remove") {
    return {
      ...library,
      books: library.books.filter(({ id }) => id !== change.id),
      sessions: library.sessions.filter(({ bookId }) => bookId !== change.id),
    };
  }
  if (change.kind === "edit") return replaceBook(library, { ...book, ...change.fields });
  if (change.kind === "status") return replaceBook(library, { ...book, status: change.status });

  if (library.sessions.some(({ id }) => id === change.sessionId)) return library;
  const { page, chapter } = change.progress;
  if (page !== undefined && book.totalPages !== undefined && page > book.totalPages) {
    throw new Error("The book’s total pages changed. Enter a position within the new total.");
  }
  const updated = replaceBook(library, {
    ...book, page, chapter, notes: change.notes ?? book.notes,
    lastRead: localDate(new Date(change.readAt)),
    status: book.status === "finished" ? "finished" : "reading",
  });
  return {
    ...updated,
    sessions: [{ id: change.sessionId, bookId: book.id, readAt: change.readAt, page, chapter }, ...library.sessions],
  };
}

function replaceBook(library: Library, updated: Book): Library {
  return { ...library, books: library.books.map((book) => book.id === updated.id ? updated : book) };
}
