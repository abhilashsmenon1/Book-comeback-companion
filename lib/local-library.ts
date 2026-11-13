import { isLibrary } from "./library-data.ts";
import type { Library } from "./books.ts";
import { exampleLibrary } from "./examples.ts";
import { changeLibrary } from "./library.ts";
import type { LibraryRepository } from "./library.ts";
import type { SyncAnchor } from "./sync.ts";

export const libraryKey = "book-comeback.library.v1";

type Recovery = { id: string; savedAt: string; library: Library };
export interface RecoveryRepository {
  recovery(): Promise<Recovery | null>;
  undo(recoveryId: string): Promise<Library>;
  anchor(): Promise<SyncAnchor | null>;
  exchange(work: (library: Library, anchor: SyncAnchor | null) => Promise<{ library: Library; anchor: SyncAnchor }>): Promise<Library>;
}

function syncAnchor(): SyncAnchor | null {
  const raw = window.localStorage.getItem(libraryKey);
  const anchor = raw ? (JSON.parse(raw) as { sync?: SyncAnchor }).sync : undefined;
  if (!anchor) return null;
  if (!anchor.userId || !Number.isSafeInteger(anchor.revision) || anchor.revision < 1 || !isLibrary(anchor.library)) {
    throw new Error("Sync details could not be read. Export your library before changing storage.");
  }
  return anchor;
}

function recoveryPoint(): Recovery | null {
  const raw = window.localStorage.getItem(libraryKey);
  if (!raw) return null;
  const saved = JSON.parse(raw) as { recovery?: Recovery };
  const point = saved.recovery;
  if (!point) return null;
  if (typeof point.id !== "string" || !point.id || typeof point.savedAt !== "string" ||
      !Number.isFinite(Date.parse(point.savedAt)) || !isLibrary(point.library)) {
    throw new Error("The previous version couldn’t be read. Your current library is unchanged.");
  }
  return point;
}

async function withLibraryLock<T>(write: () => T): Promise<T> {
  return navigator.locks ? await navigator.locks.request(libraryKey, async () => write()) : await Promise.resolve().then(write);
}

function readLibrary(): Library {
  const raw = window.localStorage.getItem(libraryKey);
  if (raw === null) return exampleLibrary();

  try {
    const saved: unknown = JSON.parse(raw);
    if (isLibrary(saved)) return { version: 1, books: saved.books, sessions: saved.sessions };
  } catch {
    // Preserve unreadable storage for recovery.
  }
  throw new Error("This browser’s saved library could not be read. Your stored data was left in place.");
}

export const localLibrary: LibraryRepository & RecoveryRepository = {
  async load() {
    return readLibrary();
  },
  async apply(change) {
    function write() {
      const current = readLibrary();
      const next = changeLibrary(current, change);
      if (JSON.stringify(current) === JSON.stringify(next)) return current;
      try {
        window.localStorage.setItem(libraryKey, JSON.stringify({ ...next, sync: syncAnchor(), recovery: {
          id: crypto.randomUUID(), savedAt: new Date().toISOString(), library: current,
        } }));
      } catch {
        throw new Error("Your changes couldn’t be saved. Check that this browser allows local storage and has free space.");
      }
      return next;
    }

    return withLibraryLock(write);
  },
  async recovery() {
    readLibrary();
    return recoveryPoint();
  },
  async undo(recoveryId) {
    return withLibraryLock(() => {
      readLibrary();
      const point = recoveryPoint();
      if (!point || point.id !== recoveryId) throw new Error("Your library changed since this undo was shown. Refresh before trying again.");
      const previous = { version: 1 as const, books: point.library.books, sessions: point.library.sessions };
      try { window.localStorage.setItem(libraryKey, JSON.stringify({ ...previous, sync: syncAnchor() })); }
      catch { throw new Error("Undo couldn’t be saved. Your current library is unchanged."); }
      return previous;
    });
  },
  async anchor() { return syncAnchor(); },
  async exchange(work) {
    // Use the same lock as local edits so no progress update can race a cloud exchange.
    const exchange = async () => {
      const current = readLibrary();
      const raw = window.localStorage.getItem(libraryKey);
      const result = await work(current, syncAnchor());
      if (window.localStorage.getItem(libraryKey) !== raw) throw new Error("The library changed during sync. Try syncing again.");
      const recovery = JSON.stringify(current) === JSON.stringify(result.library) ? recoveryPoint() : {
        id: crypto.randomUUID(), savedAt: new Date().toISOString(), library: current,
      };
      window.localStorage.setItem(libraryKey, JSON.stringify({ ...result.library, sync: result.anchor, recovery }));
      return result.library;
    };
    return navigator.locks ? navigator.locks.request(libraryKey, exchange) : exchange();
  },
};
