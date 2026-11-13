import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Library } from "./books";
import { localLibrary } from "./local-library";
import { mergeChanges, personalLibrary, sameData } from "./sync";
import type { CloudState } from "./sync";
import { validateBackup } from "./transfer";

let client: SupabaseClient | null = null;
export function supabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { detectSessionInUrl: false }, global: {
    fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15_000) }),
  } });
  return client;
}
export async function cloudLibrary(userId: string): Promise<CloudState | null> {
  const client = supabaseClient();
  if (!client) throw new Error("Supabase setup is not complete.");
  const { data, error } = await client.from("reading_libraries").select("revision,data").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? { revision: data.revision, library: validateBackup(data.data) } : null;
}
export async function synchronize(userId: string, choice?: "device" | "cloud", reviewedRevision?: number, restore?: Library, reviewedLocal?: Library) {
  const client = supabaseClient();
  if (!client) throw new Error("Supabase setup is not complete.");
  return localLibrary.exchange(async (local, anchor) => {
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || user?.id !== userId) throw new Error("Sign in again before syncing.");
    if (anchor && anchor.userId !== userId) throw new Error("This device’s library belongs to another account. Sign back into that account to sync.");
    if (choice && (!reviewedLocal || !sameData(local, reviewedLocal))) throw new Error("Your device library changed since this review. Review again before replacing either version.");
    const remote = await cloudLibrary(userId);
    const revision = remote?.revision ?? 0;
    if (choice && reviewedRevision !== revision) throw new Error("The cloud library changed since your review. Review again before replacing either version.");
    if (!anchor && !choice) throw new Error("Review your device and cloud libraries before enabling sync.");
    let next: Library;
    if (choice === "cloud") {
      if (!remote) throw new Error("There is no cloud library yet.");
      next = remote.library;
    } else if (choice === "device") next = personalLibrary(restore ?? local);
    else {
      if (!remote || !anchor) throw new Error("Cloud library unavailable. Your local books are unchanged.");
      next = mergeChanges(anchor.library, personalLibrary(local), remote.library);
    }
    let saved = remote;
    if (!remote || !sameData(next, remote.library)) {
      const { data, error } = await client.rpc("save_reading_library", { expected_revision: revision, next_data: next });
      if (error) throw new Error(error.code === "40001" ? "Another device saved first. Sync again to review its changes." : error.message);
      saved = { revision: data, library: next };
    }
    if (!saved) throw new Error("Cloud save wasn’t confirmed.");
    return { library: next, anchor: { ...saved, userId } };
  });
}
