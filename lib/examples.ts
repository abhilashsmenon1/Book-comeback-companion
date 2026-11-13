import { localDate } from "./books.ts";
import type { Library } from "./books.ts";

export function exampleLibrary(now = new Date()): Library {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 8);
  return {
    version: 1,
    books: [
      {
        id: "sample-tide", example: true, title: "The Lanterns of Low Tide", author: "Mara Ellery",
        status: "reading", totalPages: 288, page: 104, chapter: "Chapter 6",
        lastRead: localDate(yesterday), notes: "The lighthouse keeper’s letter is tucked inside the tide chart. Start at the harbor scene.",
      },
      {
        id: "sample-garden", example: true, title: "A Map of Quiet Gardens", author: "Nina Alder",
        status: "paused", totalPages: 320, page: 86, chapter: "Chapter 4",
        lastRead: localDate(lastWeek), notes: "Ada found the key in the greenhouse. I was just about to learn why the south gate stays locked.",
      },
      {
        id: "sample-orchard", example: true, title: "The Winter Orchard", author: "Jonah Vale",
        status: "want", totalPages: 246, notes: "",
      },
      {
        id: "sample-rain", example: true, title: "Letters Before the Rain", author: "Leonie Wren",
        status: "finished", totalPages: 212, page: 212, lastRead: localDate(lastWeek),
        notes: "I liked the short chapters and the way the letters carried the story.",
      },
    ],
    sessions: [],
  };
}
