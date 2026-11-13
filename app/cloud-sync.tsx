import { useCallback, useEffect, useRef, useState } from "react";
import type { Library } from "../lib/books";
import { localLibrary } from "../lib/local-library";
import { cloudLibrary, supabaseClient, synchronize } from "../lib/supabase";
import type { CloudState } from "../lib/sync";
import { sameData } from "../lib/sync";
import { validateBackup } from "../lib/transfer";

export function CloudSync({ library, onUpdate }: { library: Library; onUpdate: (library: Library) => void }) {
  const client = supabaseClient();
  const [userId, setUserId] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [status, setStatus] = useState("Local library saved on this device.");
  const [error, setError] = useState("");
  const [review, setReview] = useState<{ cloud: CloudState | null; local: Library } | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [backups, setBackups] = useState<{ revision: number; saved_at: string }[]>([]);
  const [restore, setRestore] = useState<{ revision: number; library: Library } | null>(null);

  useEffect(() => {
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? ""); setAccountEmail(session?.user.email ?? "");
      setReview(null); setBackups([]); setRestore(null); setBlocked(false);
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  const sync = useCallback(async () => {
    if (!userId || running.current || blocked || review) return;
    running.current = true; setBusy(true);
    try {
      const anchor = await localLibrary.anchor();
      if (!anchor) { setStatus("Sign-in complete. Review your libraries to enable sync."); return; }
      setStatus("Syncing…");
      const next = await synchronize(userId);
      if (!sameData(library, next)) onUpdate(next);
      setStatus(`Synced at ${new Date().toLocaleTimeString()}. Cloud recovery copies available.`); setError("");
    } catch (reason) {
      const text = reason instanceof Error ? reason.message : "Sync unavailable.";
      setError(text); setStatus("Saved locally. Cloud sync needs attention.");
      if (/Both devices|another account|revision changed/i.test(text)) setBlocked(true);
    } finally { running.current = false; setBusy(false); }
  }, [userId, blocked, review, library, onUpdate]);

  useEffect(() => {
    if (!client || !userId) return;
    const pending = window.setTimeout(() => void sync(), 1200);
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void sync(); }, 30_000);
    const resume = () => { if (document.visibilityState === "visible") void sync(); };
    window.addEventListener("online", resume); document.addEventListener("visibilitychange", resume);
    return () => { clearTimeout(pending); clearInterval(interval); window.removeEventListener("online", resume); document.removeEventListener("visibilitychange", resume); };
  }, [client, userId, sync]);

  async function act(work: () => Promise<void>) {
    if (running.current) return;
    running.current = true; setBusy(true); setError("");
    try { await work(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The request failed. Try again."); }
    finally { running.current = false; setBusy(false); }
  }

  async function reviewLibraries() {
    const [cloud, local] = await Promise.all([cloudLibrary(userId), localLibrary.load()]);
    setReview({ cloud, local }); setBlocked(true);
  }
  async function choose(choice: "device" | "cloud") {
    if (!review) return;
    const next = await synchronize(userId, choice, review.cloud?.revision ?? 0, choice === "device" ? restore?.library : undefined, review.local);
    onUpdate(next); setReview(null); setRestore(null); setBlocked(false); setStatus("Synced. Automatic sync is enabled for this account.");
  }

  return <details className="panel mt-4"><summary>Sync &amp; backup</summary>
    {!client ? <p>Cloud sync is not configured yet. Your books stay saved on this device. Download a library file for an independent backup.</p> : <>
      <p role="status">{status}</p>
      {!userId ? <form className="book-form" onSubmit={event => {
        event.preventDefault(); void act(async () => {
          if (sent) {
            const { error } = await client.auth.verifyOtp({ email, token: code.trim(), type: "email" });
            if (error) throw error; setCode(""); setSent(false);
          } else {
            const { error } = await client.auth.signInWithOtp({ email });
            if (error) throw error; setSent(true); setStatus("Check your email for the sign-in code.");
          }
        });
      }}>
        <p>Sign in to sync your private library. Use the same email on your other devices. Each adult can use their own account.</p>
        <label className="field">Email<input type="email" autoComplete="email" required value={email} disabled={sent} onChange={event => setEmail(event.target.value)} /></label>
        {sent && <label className="field">Email code<input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={event => setCode(event.target.value)} /></label>}
        <button type="submit" className="button primary" disabled={busy}>{busy ? "Please wait…" : sent ? "Verify code" : "Email me a code"}</button>
        {sent && <button type="button" className="button secondary" disabled={busy} onClick={() => { setSent(false); setCode(""); }}>Use another email or resend</button>}
      </form> : <>
        <p>Signed in as {accountEmail}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="button secondary" disabled={busy || blocked || !!review} onClick={() => void sync()}>Sync now</button>
          <button type="button" className="button secondary" disabled={busy} onClick={() => void act(reviewLibraries)}>Review device and cloud</button>
          <button type="button" className="button secondary" disabled={busy} onClick={() => void act(async () => {
            const { error } = await client.auth.signOut({ scope: "local" }); if (error) throw error;
            setStatus("Signed out. This device still contains your local library.");
          })}>Sign out</button>
        </div>
        {review && <section className="panel">
          <h3>Choose the library to keep</h3>
          <p>No automatic replacement happens at first sign-in or after a conflict. The choice below replaces one version. Export a library file first if you want to keep both independently.</p>
          <p>On this device: {review.local.books.filter(book => !book.example).map(book => `${book.title} (${book.page ? `p. ${book.page}` : book.chapter || "no bookmark"})`).join(", ") || "No personal books"}</p>
          <p>In cloud: {review.cloud?.library.books.map(book => `${book.title} (${book.page ? `p. ${book.page}` : book.chapter || "no bookmark"})`).join(", ") || "No books"}</p>
          {restore && <p>Selected backup revision {restore.revision}: {restore.library.books.length} books. Restoring creates a new cloud revision.</p>}
          <button type="button" className="button primary" disabled={busy} onClick={() => void act(() => choose("device"))}>{restore ? "Restore selected backup" : "Use this device’s library in cloud"}</button>
          {review.cloud && !restore && <button type="button" className="button secondary" disabled={busy} onClick={() => void act(() => choose("cloud"))}>Use cloud library on this device</button>}
          <button type="button" className="button secondary" disabled={busy} onClick={() => { setReview(null); setRestore(null); setBlocked(false); }}>Cancel review</button>
        </section>}
        <details><summary>Cloud recovery copies</summary>
          <p>The most recent 30 successful cloud saves are retained. This is a rolling recovery history, not an unlimited archive. Download files for longer-term backups.</p>
          <button type="button" className="button secondary" disabled={busy} onClick={() => void act(async () => {
            const { data, error } = await client.from("reading_backups").select("revision,saved_at").eq("user_id", userId).order("revision", { ascending: false }).limit(30);
            if (error) throw error; setBackups(data ?? []);
          })}>Load recovery copies</button>
          <ul>{backups.map(backup => <li key={backup.revision}>
            <button type="button" className="button secondary" disabled={busy} onClick={() => void act(async () => {
              const { data, error } = await client.from("reading_backups").select("data").eq("user_id", userId).eq("revision", backup.revision).single();
              if (error) throw error;
              setRestore({ revision: backup.revision, library: validateBackup(data.data) }); await reviewLibraries();
            })}>Review revision {backup.revision} · {new Date(backup.saved_at).toLocaleString()}</button>
          </li>)}</ul>
        </details>
      </>}
    </>}
    {error && <p role="alert" className="field-error">{error}</p>}
    <a className="text-link" href="#transfer">Download or import a library file</a>
  </details>;
}
