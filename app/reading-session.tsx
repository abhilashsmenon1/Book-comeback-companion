import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Book, Library } from "../lib/books";
import { positionLabel, validateBook } from "../lib/books";
import { localLibrary } from "../lib/local-library";
import { braveMusicLink, musicLink, notionPageLink, readingShortcutLink, readingShortcutName } from "../lib/reading";

export function ReadingSessionPanel({ book, onUpdate }: { book: Book; onUpdate: (library: Library) => void }) {
  const [error, setError] = useState("");
  const [track, setTrack] = useState("");
  const [trackInput, setTrackInput] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const notionKey = `book-comeback.notion.${book.id}`;
  const [notion, setNotion] = useState("");
  const [notionInput, setNotionInput] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const music = musicLink(localStorage.getItem("book-comeback.music") ?? "");
      setTrack(music); setTrackInput(music);
      const page = notionPageLink(localStorage.getItem(notionKey) ?? "");
      setNotion(page); setNotionInput(page);
      setReady(localStorage.getItem("book-comeback.shortcut-ready") === "yes");
    } catch { setError("Reading settings couldn’t be restored. Your library is unchanged."); }
  }, [notionKey]);

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = validateBook({ title: book.title, author: book.author, status: book.status,
      page: String(data.get("page") ?? ""), chapter: String(data.get("chapter") ?? ""),
      totalPages: String(book.totalPages ?? ""), lastRead: "", notes: "" });
    if ("errors" in result) { setError(Object.values(result.errors).join(" ")); return; }
    setBusy(true); setError("");
    try {
      const library = await localLibrary.apply({ kind: "log", id: book.id, sessionId: crypto.randomUUID(),
        readAt: new Date().toISOString(), progress: { page: result.value.page, chapter: result.value.chapter } });
      onUpdate(library); setFinishing(false);
      setMessage("Progress saved on this device. Come back whenever you’re ready.");
    } catch (err) { setError(err instanceof Error ? err.message : "Progress couldn’t be saved. Try again."); }
    finally { setBusy(false); }
  }

  return <section className="panel resume-panel" aria-label="Your reading session">
    <p className="eyebrow">A little time for your book</p>
    <h2>{book.title}</h2>
    <p>{positionLabel(book)}</p>
    {!book.notes && <p className="muted">Reopen your bookmark or reread a couple of pages to find your place.</p>}
    <p>15 minutes in iPhone Clock · Your music in Brave</p>
    {ready && track ? <a className="button primary" href={readingShortcutLink(track)} onClick={() => setMessage("Shortcut requested. Check Clock for the timer and press Play in Brave if needed.")}>Start reading ↗</a>
      : <p className="feedback">Complete the one-time iPhone setup below to enable Start reading.</p>}
    <p><a className="button secondary" href={notion || "notion://"}>Open in Notion ↗</a></p>
    <button type="button" className="button primary" onClick={() => setFinishing(!finishing)} aria-expanded={finishing}>Done for now</button>
    {finishing && <form onSubmit={finish} className="book-form">
      <div className="form-grid">
        <label className="field">Current page<input name="page" inputMode="numeric" defaultValue={book.page} maxLength={16} /></label>
        <label className="field">Chapter or bookmark<input name="chapter" defaultValue={book.chapter} maxLength={80} /></label>
      </div>
      <button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save my place"}</button>
    </form>}
    {book.notes && <details><summary>Previous notes (saved here)</summary><p className="note-text">{book.notes}</p><p>Your existing notes are preserved. New notes can go directly into Notion.</p></details>}
    <details><summary>Notion page for this book</summary>
      <p>Paste this book’s Notion page link to open it directly. Without a page link, the button opens the Notion app. Your phone may ask which app to use.</p>
      <label className="field">Notion page link<input type="url" value={notionInput} onChange={event => setNotionInput(event.target.value)} /></label>
      <button type="button" className="button secondary" onClick={() => {
        try { const page = notionPageLink(notionInput); localStorage.setItem(notionKey, page); setNotion(page); setMessage("Notion link saved on this device."); setError(""); }
        catch { setError("Couldn’t save the link. Use an HTTPS Notion page link and allow browser storage."); }
      }}>Save Notion link</button>
    </details>
    <details open={!ready}><summary>One-time iPhone setup</summary>
      <p>Create a shortcut in Apple Shortcuts named exactly <strong>{readingShortcutName}</strong>.</p>
      <ol className="list-decimal pl-5">
        <li>Add Clock’s <strong>Start Timer</strong> action and set it to <strong>15 minutes</strong>.</li>
        <li>Add <strong>Open URLs</strong>. Set its URL to the <strong>Shortcut Input</strong> variable. The app sends your Brave music link as that input.</li>
        <li>Save the shortcut. Save your track below, then confirm setup here.</li>
      </ol>
      <p>The shortcut must be created on your iPhone. This app cannot install it or verify that Clock started. Music may need a Play tap; Clock controls the timer and its alarm.</p>
      <label className="field"><span><input type="checkbox" checked={ready} onChange={event => {
        try { localStorage.setItem("book-comeback.shortcut-ready", event.target.checked ? "yes" : "no"); setReady(event.target.checked); }
        catch { setError("Couldn’t save setup. Check browser storage."); }
      }} /> I created the shortcut on this iPhone</span></label>
    </details>
    <details><summary>Reading music</summary>
      <p>Start reading passes your saved track to the iPhone shortcut. Brave must be installed. Background playback depends on Brave and YouTube.</p>
      <p>If Brave doesn’t open, copy the link and paste it into Brave’s address bar. Avoid pressing Start reading again just to retry music: that may start another Clock timer.</p>
      <label className="field">YouTube music link<input type="url" value={trackInput} onChange={event => setTrackInput(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" /></label>
      <button type="button" className="button secondary" onClick={() => {
        try { const url = musicLink(trackInput); localStorage.setItem("book-comeback.music", url); setTrack(url); setMessage(url ? "Music link saved on this device." : "Music link removed."); setError(""); }
        catch { setError("Couldn’t save music. Use an HTTPS YouTube link and allow browser storage."); }
      }}>Save music link</button>
      {track && <a className="text-link" href={braveMusicLink(track)}>Open music only in Brave ↗</a>}
      {track && <button type="button" className="button secondary" onClick={() => {
        void navigator.clipboard.writeText(track).then(() => setMessage("Music link copied. Paste it into Brave’s address bar."),
          () => setError("Couldn’t copy. Select and copy the YouTube music link above."));
      }}>Copy music link</button>}
    </details>
    {error && <p role="alert" className="field-error">{error}</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
