export const shelves = [
  { id: "reading", label: "Currently Reading", empty: "Books you’re spending time with will show up here." },
  { id: "paused", label: "Paused", empty: "A book can wait until you’re ready to pick it up again." },
  { id: "want", label: "Want to Read", empty: "Save a book here for whenever the mood strikes." },
  { id: "finished", label: "Finished", empty: "Finished books will have a home here." },
] as const;

export type BookStatus = (typeof shelves)[number]["id"];

export interface Progress {
  page?: number;
  chapter?: string;
}

export interface BookFields extends Progress {
  title: string;
  author: string;
  status: BookStatus;
  totalPages?: number;
  lastRead?: string;
  notes: string;
}

export interface Book extends BookFields {
  id: string;
  example?: true;
}

export interface ReadingSession extends Progress {
  id: string;
  bookId: string;
  readAt: string;
}

export interface Library {
  version: 1;
  books: Book[];
  sessions: ReadingSession[];
}

export type BookInput = Record<keyof BookFields, string>;
export type FieldErrors = Partial<Record<keyof BookFields, string>>;
type Validation = { value: BookFields } | { errors: FieldErrors };

export function localDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validateBook(input: BookInput, today = localDate(new Date())): Validation {
  const title = input.title.trim();
  const author = input.author.trim();
  const chapter = input.chapter.trim();
  const notes = input.notes.trim();
  const errors: FieldErrors = {};

  if (!title || title.length > 120) errors.title = "Enter a title between 1 and 120 characters.";
  if (!author || author.length > 100) errors.author = "Enter an author between 1 and 100 characters.";
  if (chapter.length > 80) errors.chapter = "Keep the chapter label to 80 characters.";
  if (notes.length > 5000) errors.notes = "Keep notes to 5,000 characters.";
  const status = shelves.find((shelf) => shelf.id === input.status)?.id;
  if (!status) errors.status = "Choose a reading status.";

  const totalPages = input.totalPages.trim() ? Number(input.totalPages) : undefined;
  const page = input.page.trim() ? Number(input.page) : undefined;
  if (totalPages !== undefined && (!/^\d+$/.test(input.totalPages.trim()) || !Number.isSafeInteger(totalPages) || totalPages < 1)) {
    errors.totalPages = "Enter a positive whole number.";
  }
  if (page !== undefined && (!/^\d+$/.test(input.page.trim()) || !Number.isSafeInteger(page) || page < 1)) {
    errors.page = "Enter a positive whole number.";
  } else if (page !== undefined && totalPages !== undefined && !errors.totalPages && page > totalPages) {
    errors.page = "Current page can’t exceed the total pages.";
  }
  const lastRead = input.lastRead || undefined;
  if (lastRead && (!isCalendarDate(lastRead) || lastRead > today)) errors.lastRead = "Choose today or an earlier date.";

  if (!status || Object.keys(errors).length) return { errors };
  return { value: { title, author, status, totalPages, page, chapter: chapter || undefined, lastRead, notes } };
}

export function positionLabel(progress: Progress) {
  const parts = [];
  if (progress.page !== undefined) parts.push(`Page ${progress.page}`);
  if (progress.chapter) parts.push(progress.chapter);
  return parts.join(" · ") || "No position saved";
}

export function progressPercent(book: BookFields) {
  if (book.status === "finished") return 100;
  if (book.page === undefined || book.totalPages === undefined) return null;
  return Math.min(100, Math.round(book.page / book.totalPages * 100));
}

export function readingStats(library: Library, now: Date) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return {
    reading: library.books.filter((book) => book.status === "reading").length,
    paused: library.books.filter((book) => book.status === "paused").length,
    finished: library.books.filter((book) => book.status === "finished").length,
    sessions: library.sessions.filter(({ readAt }) => {
      const date = new Date(readAt);
      return date >= monday && date <= now;
    }).length,
  };
}
