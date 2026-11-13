import { useEffect, useState } from "react";
import type { Library } from "../lib/books";
import { localLibrary } from "../lib/local-library";

export function RecoveryControls({ library, onUpdate }: { library: Library; onUpdate: (library: Library) => void }) {
  const [point, setPoint] = useState<{ id: string; savedAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  // biome-ignore lint/correctness/useExhaustiveDependencies: Every library update invalidates the persisted recovery point, including updates in another tab.
  useEffect(() => {
    let active = true;
    void localLibrary.recovery().then(value => { if (active) setPoint(value); }, () => {
      if (active) { setPoint(null); setError("Undo isn’t available. Your current library is still saved."); }
    });
    return () => { active = false; };
  }, [library]);
  return <details className="panel mt-4"><summary>Undo the last library change</summary>
    <p>Restore your library to just before the last saved change, including notes and reading sessions. This recovery copy stays on this device; it isn’t a cloud backup.</p>
    {point ? <>
      <p>Last change: {new Date(point.savedAt).toLocaleString()}</p>
      <button type="button" className="button secondary" disabled={busy} onClick={() => {
        setBusy(true); setError(""); setMessage("");
        void localLibrary.undo(point.id).then(previous => {
          setPoint(null); onUpdate(previous); setMessage("Last change undone and saved on this device.");
        }, reason => setError(reason instanceof Error ? reason.message : "Undo failed.")).finally(() => setBusy(false));
      }}>{busy ? "Restoring…" : "Undo last change"}</button>
    </> : <p>No previous change to undo yet.</p>}
    {error && <p role="alert" className="field-error">{error}</p>}
    {message && <p role="status">{message}</p>}
  </details>;
}
