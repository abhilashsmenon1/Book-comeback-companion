import { positionLabel, progressPercent, shelves } from "../lib/books";
import type { Book, BookStatus, Library, ReadingSession } from "../lib/books";
import { ReadingSessionPanel } from "./reading-session";
import { BookCover, Icon } from "./visuals";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function formatReadingDate(date: string) {
  return dateFormat.format(new Date(date.includes("T") ? date : `${date}T12:00:00`));
}

export function ProgressBar({ book }: { book: Book }) {
  const progress = progressPercent(book);
  if (progress === null) return null;
  return <div className="progress-row"><progress aria-label="Book progress" value={progress} max={100} /><span>{progress}%</span></div>;
}

export function BookDetail({ book, sessions, busy, onStatus, onUpdate }: {
  book: Book;
  onUpdate: (library: Library) => void;
  sessions: ReadingSession[];
  busy: boolean;
  onStatus: (status: BookStatus) => void;
}) {
  const id = encodeURIComponent(book.id);
  return <>
    <a className="text-link back-link" href="#library"><Icon name="back" size={18} /> My Library</a>
    <div className="detail-heading">
      <BookCover book={book} />
      <div className="min-w-0">
        <p className={`pill status-${book.status}`}>{shelves.find((shelf) => shelf.id === book.status)?.label}</p>
        <h1>{book.title}</h1><p className="byline">{book.author}{book.example ? " · Sample book" : ""}</p>
      </div>
    </div>
    <div className="detail-grid">
      <div className="detail-stack">
        <ReadingSessionPanel key={book.id} book={book} onUpdate={onUpdate} />
        <section className="panel" aria-labelledby="position-heading">
          <p className="eyebrow"><Icon name="bookmark" size={16} /> Your bookmark</p>
          <h2 id="position-heading">Last saved position</h2>
          <p>{positionLabel(book)}{book.totalPages ? ` · ${book.totalPages} pages total` : ""}</p>
          <ProgressBar book={book} />
          <p className="muted">{book.lastRead ? `Last read ${formatReadingDate(book.lastRead)}` : "No reading date saved"}</p>
          <a className="button primary mt-2" href={`#log/${id}`}><Icon name="pencil" size={17} /> Log progress</a>
        </section>
      </div>
      <div className="detail-stack">
        <section className="panel" aria-labelledby="sessions-heading">
          <h2 id="sessions-heading">Recent sessions</h2>
          {sessions.length > 0
            ? <ul className="session-list">{[...sessions].sort((a, b) => Date.parse(b.readAt) - Date.parse(a.readAt)).slice(0, 5).map((session) =>
              <li key={session.id}><time dateTime={session.readAt}>{formatReadingDate(session.readAt)}</time><span>{positionLabel(session)}</span></li>)}</ul>
            : <p className="muted">No reading sessions yet. Log progress after you read to save one.</p>}
        </section>
        <div className="flex flex-wrap gap-3">
          {book.status === "reading" && <button type="button" className="button secondary" disabled={busy} onClick={() => onStatus("paused")}>Pause book</button>}
          {(book.status === "reading" || book.status === "paused") && <button type="button" className="button secondary" disabled={busy} onClick={() => onStatus("finished")}>Mark finished</button>}
          <a className="button secondary" href={`#edit/${id}`}><Icon name="pencil" size={16} /> Edit book</a>
          <a className="button danger-link" href={`#remove/${id}`}>Remove book</a>
        </div>
      </div>
    </div>
  </>;
}
