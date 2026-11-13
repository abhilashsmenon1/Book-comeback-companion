import type { Book, Library } from "./books.ts";

export const readingSeconds = 15 * 60;
export const readingShortcutName = "Book Comeback Reading";
export function readingShortcutLink(track: string) {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(readingShortcutName)}&input=text&text=${encodeURIComponent(braveMusicLink(track))}`;
}
export function notionPageLink(value: string) {
  if (!value.trim()) return "";
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !(url.hostname === "notion.so" || url.hostname.endsWith(".notion.so") || url.hostname === "notion.site" || url.hostname.endsWith(".notion.site"))) {
    throw new Error("Paste an HTTPS Notion page link.");
  }
  return url.href;
}
export function currentBook(library: Library) {
  return [...library.books].filter(b => b.status === "reading" || b.status === "paused")
    .sort((a, b) => Number(Boolean(a.example)) - Number(Boolean(b.example)) ||
      Number(a.status === "paused") - Number(b.status === "paused") ||
      (b.lastRead ?? "").localeCompare(a.lastRead ?? ""))[0];
}
export function notesForNotion(book: Book, notes = book.notes) {
  return `# ${book.title}\n\nBy ${book.author}\n\n## Reading notes\n\n${notes || "No notes yet."}\n`;
}
export function musicLink(value: string) {
  if (!value.trim()) return "";
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || url.username || url.password || url.port || !["www.youtube.com", "youtube.com", "m.youtube.com", "youtu.be"].includes(url.hostname)) {
    throw new Error("Use an HTTPS YouTube link.");
  }
  if (url.hostname === "m.youtube.com") url.hostname = "www.youtube.com";
  return url.href;
}

export function braveMusicLink(value: string) {
  const url = musicLink(value);
  return url ? `brave://open-url?url=${encodeURIComponent(url)}` : "";
}
