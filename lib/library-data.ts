import { isCalendarDate, shelves } from "./books.ts";
import type { Library } from "./books.ts";
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalPage(value: unknown) {
  return value === undefined || (typeof value === "number" && Number.isSafeInteger(value) && value > 0);
}

function optionalText(value: unknown) {
  return value === undefined || typeof value === "string";
}

export function isLibrary(value: unknown): value is Library {
  return isRecord(value) && value.version === 1 &&
    Array.isArray(value.books) && value.books.every((book: unknown) =>
      isRecord(book) && typeof book.id === "string" && typeof book.title === "string" &&
      typeof book.author === "string" && typeof book.notes === "string" &&
      shelves.some(({ id }) => id === book.status) &&
      optionalPage(book.totalPages) && optionalPage(book.page) && optionalText(book.chapter) &&
      (book.lastRead === undefined || (typeof book.lastRead === "string" && isCalendarDate(book.lastRead))) &&
      (book.example === undefined || book.example === true)
    ) &&
    Array.isArray(value.sessions) && value.sessions.every((session: unknown) =>
      isRecord(session) && typeof session.id === "string" && typeof session.bookId === "string" &&
      typeof session.readAt === "string" && Number.isFinite(Date.parse(session.readAt)) &&
      optionalPage(session.page) && optionalText(session.chapter)
    );
}


