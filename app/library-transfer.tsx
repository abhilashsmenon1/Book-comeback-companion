import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Library } from "../lib/books";
import { localDate } from "../lib/books";
import { localLibrary } from "../lib/local-library";
import { maxBackupBytes, parseBackup, serializeBackup } from "../lib/transfer";
import { Icon } from "./visuals";

export function LibraryTransfer({ library, busy, onImport }: {
  library: Library;
  busy: boolean;
  onImport: (library: Library) => Promise<void>;
}) {
  const [preview, setPreview] = useState<Library | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reading, setReading] = useState(false);
  const selection = useRef(0);

  async function exportLibrary() {
    setError("");
    try {
      const saved = await localLibrary.load();
      const blob = new Blob([serializeBackup(saved)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `book-comeback-${localDate(new Date())}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage("Your library file is ready. Keep it in Files or Downloads for backup or transfer.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The export couldn’t be created.");
    }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const request = ++selection.current;
    const file = event.target.files?.[0];
    setPreview(null);
    setError("");
    setMessage("");
    if (!file) return;
    setReading(true);
    try {
      if (file.size > maxBackupBytes) throw new Error("Choose a library file smaller than 5 MB.");
      const imported = parseBackup(await file.text());
      if (request === selection.current) setPreview(imported);
    } catch (reason) {
      if (request === selection.current) {
        setError(reason instanceof Error ? reason.message : "This file couldn’t be read.");
      }
    } finally {
      if (request === selection.current) setReading(false);
    }
  }

  const existingIds = new Set(library.books.filter((book) => !book.example).map((book) => book.id));
  const newBooks = preview?.books.filter((book) => !existingIds.has(book.id)).length ?? 0;

  return <div className="narrow">
    <a className="text-link back-link" href="#library"><Icon name="back" size={18} /> My Library</a>
    <h1>Bring your books along.</h1>
    <p className="page-intro">Save a copy of your books, notes, bookmarks, and reading sessions, or bring a saved library to this device.</p>
    {error && <p className="feedback error" role="alert">{error}</p>}
    <div role="status">{(message || reading) && <p className="feedback">{reading ? "Reading your library file…" : message}</p>}</div>
    <div className="detail-stack">
      <section className="panel" aria-labelledby="export-title">
        <h2 id="export-title">Export your library</h2>
        <p>The file includes your personal notes. Save it somewhere you trust and share it only with someone you want to have them.</p>
        <button type="button" className="button primary" onClick={() => void exportLibrary()} disabled={busy}>Download library</button>
      </section>
      <section className="panel" aria-labelledby="import-title">
        <h2 id="import-title">Import a library</h2>
        <p>Choose a Book Comeback JSON file. Existing personal books keep their current bookmarks and notes. New books and missing sessions are added, and example books are replaced.</p>
        <label className="field">
          <span>Library file</span>
          <input type="file" accept=".json,application/json" onChange={(event) => void chooseFile(event)} disabled={busy || reading} />
        </label>
        {preview && <div>
          <p className="mt-3">{preview.books.length} books and {preview.sessions.length} reading sessions in this file. {newBooks} new books will be added.</p>
          <ul className="my-3 list-disc pl-5">{preview.books.map((book) => <li key={book.id}>{book.title}</li>)}</ul>
          <button type="button" className="button primary" disabled={busy} onClick={() => void onImport(preview)}>
            {busy ? "Importing…" : "Import library"}
          </button>
        </div>}
      </section>
      <section className="panel" aria-labelledby="iphone-title">
        <h2 id="iphone-title">Move to your iPhone</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Download your library and save the file somewhere your iPhone can open, such as iCloud Drive.</li>
          <li>Open the hosted app in Safari, choose Share, then Add to Home Screen. Enable Open as Web App if offered.</li>
          <li>Open the Home Screen app, return to this screen, and choose your library file to import it.</li>
        </ol>
        <p className="muted">Each device keeps its own library. Export again whenever you want a fresh backup. Import keeps existing books, so it doesn’t synchronize later bookmark changes between devices.</p>
      </section>
    </div>
  </div>;
}
