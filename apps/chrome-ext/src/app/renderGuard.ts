// Render guard — remembers which document was being rendered when a tab froze,
// so the next load can skip it instead of freezing again.
//
// Why: the viewer tab reopens the last active document on load, and the
// browser restores an injected file:// / https tab on restart. A document that
// hangs the renderer (one pathological regex in a grammar was enough) therefore
// hangs it again on every reload, with no way to reach the UI to close it.
//
// How: `arm(key)` writes an entry to chrome.storage.local BEFORE the document
// renders; `settle(key)` removes it SETTLE_MS after the render committed. A hung
// main thread never runs the settle timer, so an entry still present at the
// next load means "this document froze the tab last time" — `takeFrozen(key)`
// reports and clears it. chrome.storage.local (not localStorage / IDB) because
// it is shared by every extension page AND every injected content script,
// whatever the host page's origin.
//
// Keys: library file ids in the viewer app (`intercept:<url>`, folder file ids),
// `inject:<url>` for documents rendered inside the file's own tab.

/** Each guarded document gets its own storage key (prefix + document key), so
 *  arming one document and settling another can never race on a shared map. */
const KEY_PREFIX = "fv:renderGuard:";

/** How long after a render commits before the document counts as "loaded".
 *  Long enough to cover post-mount effects (mermaid, charts), short enough that
 *  closing a tab right after opening a healthy doc rarely leaves a false entry. */
export const SETTLE_MS = 1000;

export interface GuardEntry {
  /** Display name for the "didn't reopen X" banner. */
  name: string;
  /** Epoch ms when rendering started. */
  at: number;
}

function storage(): chrome.storage.StorageArea | null {
  return typeof chrome !== "undefined" && chrome.storage?.local
    ? chrome.storage.local
    : null;
}

async function read(key: string): Promise<GuardEntry | null> {
  const area = storage();
  if (!area) return null;
  try {
    const bag = await area.get(KEY_PREFIX + key);
    const entry = bag[KEY_PREFIX + key] as GuardEntry | undefined;
    return entry && typeof entry.name === "string" ? entry : null;
  } catch {
    return null;
  }
}

async function remove(key: string): Promise<void> {
  try {
    await storage()?.remove(KEY_PREFIX + key);
  } catch {
    /* storage unavailable — guard degrades to a no-op */
  }
}

/** Record that `key` is about to render. Await it before rendering. */
export async function arm(key: string, name: string): Promise<void> {
  const entry: GuardEntry = { name, at: Date.now() };
  try {
    await storage()?.set({ [KEY_PREFIX + key]: entry });
  } catch {
    /* storage unavailable — guard degrades to a no-op */
  }
}

/** The render of `key` finished — forget it. */
export async function settle(key: string): Promise<void> {
  await remove(key);
}

/** Schedule `settle(key)` once the current render has had SETTLE_MS to finish.
 *  Returns an effect cleanup that settles right away: if the user could switch
 *  away from the document, the main thread wasn't frozen by it. */
export function settleLater(key: string): () => void {
  const t = setTimeout(() => void settle(key), SETTLE_MS);
  return () => {
    clearTimeout(t);
    void settle(key);
  };
}

/** If `key` froze the tab last time, return its entry and clear it (so the
 *  following load renders normally unless it freezes again). */
export async function takeFrozen(key: string): Promise<GuardEntry | null> {
  const entry = await read(key);
  if (entry) await remove(key);
  return entry;
}
