"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { positionLabel, readingStats, shelves } from "../lib/books";
import type { Library } from "../lib/books";
import type { LibraryChange } from "../lib/library";
import { libraryKey, localLibrary } from "../lib/local-library";
import { BookDetail, formatReadingDate, ProgressBar } from "./book-detail";
import { BookForm } from "./book-form";
import { currentBook } from "../lib/reading";
import { ReadingSessionPanel } from "./reading-session";
import { LibraryTransfer } from "./library-transfer";
import { RecoveryControls } from "./recovery-controls";
import { CloudSync } from "./cloud-sync";
import { BookCover, HeroArt, Icon } from "./visuals";

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getHash() {
  return window.location.hash.slice(1) || "read";
}

function newId() {
  return Array.from(window.crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bookUrl(id: string) {
  return `#book/${encodeURIComponent(id)}`;
}

function LibraryView({ library }: { library: Library }) {
  const paused = library.books.filter((book) => book.status === "paused")
    .sort((a, b) => Number(Boolean(a.example)) - Number(Boolean(b.example)) ||
      (b.lastRead ?? "").localeCompare(a.lastRead ?? ""))[0];

  return <>
    <section className="hero" aria-labelledby="welcome-heading">
      <HeroArt />
      <div className="hero-copy">
        <p className="eyebrow"><Icon name="leaf" size={16} /> Your reading room</p>
        <h1 id="welcome-heading">Find your way<br />back to a book.</h1>
        <p>A quiet place to pick up where you left off, one page at a time.</p>
        {paused && <a className="button primary" href={bookUrl(paused.id)}><Icon name="play" size={16} /> Resume reading</a>}
      </div>
    </section>
    <div className="library-heading">
      <div><h2>My Library</h2><p className="muted">{library.books.length} {library.books.length === 1 ? "book" : "books"} on your shelves</p></div>
      <a className="button primary" href="#add"><Icon name="plus" size={20} /> Add book</a>
    </div>
    {library.books.some((book) => book.example) && <p className="sample-note"><Icon name="book" size={17} /> Sample books are here to explore. Add your own whenever you’re ready.</p>}
    <div className="shelves">
      {shelves.map((shelf) => {
        const books = library.books.filter(({ status }) => status === shelf.id);
        return <section key={shelf.id} aria-labelledby={`shelf-${shelf.id}`}>
          <div className="shelf-heading"><span className={`shelf-dot status-${shelf.id}`} /><h3 id={`shelf-${shelf.id}`}>{shelf.label}</h3><span className="count">{books.length}</span></div>
          {books.length ? <ul className="cards">{books.map((book) => <li key={book.id}>
            <a className="book-card" href={bookUrl(book.id)}>
              <BookCover book={book} />
              <div className="card-copy">
                <h4>{book.title}</h4><p className="muted">{book.author}</p>
                <p className="card-position">{positionLabel(book)}</p>
                <ProgressBar book={book} />
                {book.lastRead && <p className="card-date">Last read {formatReadingDate(book.lastRead)}</p>}
              </div>
              <span className="card-arrow"><Icon name="arrow" size={19} /></span>
            </a>
          </li>)}</ul> : <p className="empty-shelf">{shelf.empty}</p>}
        </section>;
      })}
    </div>
  </>;
}

function Dashboard({ library }: { library: Library }) {
  const stats = readingStats(library, new Date());
  return <>
    <p className="eyebrow"><Icon name="leaf" size={16} /> Reading at your pace</p>
    <h1>Reading Dashboard</h1>
    <p className="page-intro">A little perspective on your shelves and the time you’ve made for books.</p>
    <dl className="stats-grid">
      <div className="panel"><dt>Currently reading</dt><dd>{stats.reading}</dd></div>
      <div className="panel"><dt>Paused books</dt><dd>{stats.paused}</dd></div>
      <div className="panel"><dt>Finished books</dt><dd>{stats.finished}</dd></div>
      <div className="panel"><dt>Sessions this week</dt><dd>{stats.sessions}</dd></div>
    </dl>
    <p className="muted text-sm">Weekly sessions count from Monday in your device’s time zone.</p>
  </>;
}

export function ReadingRoom() {
  const hash = useSyncExternalStore(subscribeToHash, getHash, () => "read");
  const [view, id] = hash.split("/");
  const [library, setLibrary] = useState<Library | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mutationError, setMutationError] = useState<{ hash: string; text: string } | null>(null);
  const [notice, setNotice] = useState<{ hash: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const main = useRef<HTMLElement>(null);
  const prevHash = useRef(hash);

  const load = useCallback(() => {
    void localLibrary.load().then((saved) => { setLibrary(saved); setLoadError(""); }, (error: unknown) => {
      setLoadError(error instanceof Error ? error.message : "Your library couldn’t be opened.");
    });
  }, []);

  useEffect(() => {
    load();
    const sync = (event: StorageEvent) => { if (event.key === libraryKey || event.key === null) load(); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [load]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.warn("Offline app setup failed.", error);
      });
    }
  }, []);

  useEffect(() => {
    if (prevHash.current !== hash) {
      prevHash.current = hash;
      main.current?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }, [hash]);

  async function save(change: LibraryChange, destination: string, message: string) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setMutationError(null);
    try {
      setLibrary(await localLibrary.apply(change));
      if (getHash() === hash) {
        setNotice({ hash: destination.slice(1), text: message });
        if (destination.slice(1) !== hash) window.location.assign(destination);
      }
    } catch (error) {
      setMutationError({ hash, text: error instanceof Error ? error.message : "Your changes couldn’t be saved." });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const activeBook = library ? currentBook(library) : undefined;
  const book = library?.books.find((item) => encodeURIComponent(item.id) === id);
  let content: ReactNode;
  if (loadError) content = <div className="panel"><h1>Couldn’t open your library</h1><p role="alert">{loadError}</p><button type="button" className="button secondary" onClick={load}>Try again</button></div>;
  else if (!library) content = <div className="panel" role="status">Opening your library…</div>;
  else if (view === "read") content = activeBook ? <div className="narrow">
    <p className="eyebrow">Welcome back</p><h1>Your reading time.</h1>
    <ReadingSessionPanel key={activeBook.id} book={activeBook} onUpdate={setLibrary} />
    <a className="button secondary mt-2" href={bookUrl(activeBook.id)}>Book details</a>
    <a className="text-link back-link" href="#library">Choose another book</a>
  </div> : <div className="panel"><h1>A little reading starts here.</h1><p>Choose a book from your library or add your own.</p><a className="button primary" href="#library">My Library</a></div>;
  else if (view === "library") content = <LibraryView library={library} />;
  else if (view === "dashboard") content = <Dashboard library={library} />;
  else if (view === "transfer") content = <LibraryTransfer library={library} busy={busy}
    onImport={(imported) => save({ kind: "import", library: imported }, "#library", "Library imported. Your books are ready.")} />;
  else if (view === "book" && book) content = <BookDetail key={book.id} book={book}
    onUpdate={setLibrary} sessions={library.sessions.filter(({ bookId }) => bookId === book.id)} busy={busy}
    onStatus={(status) => void save({ kind: "status", id: book.id, status }, bookUrl(book.id), status === "paused" ? "Book paused." : "Book marked finished.")} />;
  else if (view === "add" || (book && (view === "edit" || view === "log"))) {
    const editing = view === "edit" && book;
    const logging = view === "log" && book;
    const cancel = book && view !== "add" ? bookUrl(book.id) : "#library";
    content = <div className="narrow">
      <a className="text-link back-link" href={cancel}><Icon name="back" size={18} /> {book ? "Back to book" : "My Library"}</a>
      <h1>{editing ? "Edit book" : logging ? "Record progress" : "Add a book"}</h1>
      <p className="page-intro">{logging ? `Save your place in ${logging.title} and log a reading session.` : editing ? "Update your bookmark, notes, or shelf." : "Make space on your shelves for a book of your own."}</p>
      <BookForm key={hash} book={editing || logging || undefined} progressOnly={Boolean(logging)} busy={busy} cancel={cancel}
        onSave={(fields) => {
          if (logging) {
            const { page, chapter, notes } = fields;
            void save({ kind: "log", id: logging.id, sessionId: newId(), readAt: new Date().toISOString(), progress: { page, chapter }, notes }, cancel, "Reading session saved.");
          } else if (editing) {
            void save({ kind: "edit", id: editing.id, fields }, cancel, "Book updated.");
          } else {
            const newBookId = newId();
            void save({ kind: "add", id: newBookId, fields }, bookUrl(newBookId), "Book added.");
          }
        }} />
    </div>;
  } else if (view === "remove" && book) content = <div className="narrow panel">
    <h1>Remove this book?</h1><p>Removing <strong>{book.title}</strong> also removes its notes and reading sessions from this browser.</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" className="button danger" disabled={busy} onClick={() => void save({ kind: "remove", id: book.id }, "#library", "Book removed.")}>{busy ? "Removing…" : "Remove book"}</button>
      <a className="button secondary" href={bookUrl(book.id)}>Keep book</a>
    </div>
  </div>;
  else content = <div className="panel"><h1>Page unavailable</h1><p>This page or book could not be found in your library.</p><a className="button secondary" href="#library">Back to My Library</a></div>;

  return <>
    <button type="button" className="skip-link" onClick={() => main.current?.focus()}>Skip to content</button>
    <header className="site-header">
      <div className="shell header-inner">
        <a className="brand" href="#read"><span className="brand-icon"><Icon name="book" size={23} /></span> Book Comeback <span className="brand-extra">Companion</span></a>
        <span className="header-caption">A little reading, at your own pace</span>
      </div>
    </header>
    <main className="shell main" id="main-content" tabIndex={-1} ref={main}>
      {mutationError?.hash === hash && <p className="feedback error" role="alert">{mutationError.text}</p>}
      <div role="status">{notice?.hash === hash && <p className="feedback">{notice.text}</p>}</div>
      {content}
      {library && !loadError && <RecoveryControls library={library} onUpdate={setLibrary} />}
      {library && !loadError && <CloudSync library={library} onUpdate={setLibrary} />}
      <footer>
        <a className="text-link" href="#transfer">Back up or transfer your library</a>
        <p>Saved in this browser <span aria-hidden="true">·</span> Your reading room is yours</p>
      </footer>
    </main>
    <nav className="bottom-nav" aria-label="Main navigation">
      <div>
        <a href="#read" aria-current={view === "read" ? "page" : undefined} className={view === "read" ? "active" : ""}><Icon name="play" /> Read</a>
        <a href="#library" aria-current={view === "library" ? "page" : undefined} className={view === "library" ? "active" : ""}><Icon name="book" /> Library</a>
        <a href="#dashboard" aria-current={view === "dashboard" ? "page" : undefined} className={view === "dashboard" ? "active" : ""}><Icon name="grid" /> Dashboard</a>
      </div>
    </nav>
  </>;
}
