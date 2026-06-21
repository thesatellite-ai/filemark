// REVISION MODE — persistence core (feature map: revision/RevisionProvider.tsx).
//
// PORTABLE: zero host APIs (no chrome.*, no DOM, no IndexedDB). Persistence is
// injected via a RevisionStorageAdapter, so the exact same logic runs under
// chrome.storage (this app — see adapters/chromeStorage.ts), localStorage, a
// VS Code Memento, or an in-memory map (tests). That injection is what makes
// the whole revision feature importable into another project.
//
// What it persists:
//   1. The TRACKED SET — which docs are in revision mode. Persisted (not React
//      state) so the flag survives a reload, incl. an injected viewer's fresh
//      page on every load.
//   2. Per-doc REVISION LISTS — last MAX_REVISIONS snapshots each, newest last.
//
// Why a storage adapter and not IndexedDB directly: a host may render on a
// sandboxed page (opaque origin) where indexedDB.open() throws — the chrome
// adapter sidesteps that. See ADR REV-1 in docsi/REVISION_PLAN.md.

import { MAX_REVISIONS, TRACKED_KEY, revKey, uiKey } from "./constants";
import { hashContent } from "./hash";
import type {
  AppendResult,
  Revision,
  RevisionStorageAdapter,
  RevisionStore,
  RevisionUiState,
} from "./types";

// --- doc key (pure, host-agnostic) ------------------------------------------

/**
 * Normalize a doc's identity into a stable storage key. Same logical document
 * → same key across reloads, so its revisions and tracked flag line up.
 *
 * For http(s) URLs we drop the `#fragment` (in-page anchors aren't a different
 * doc); everything else (file:// paths, library ids) is used verbatim after a
 * trim. Returns "" for an empty/missing id — callers treat "" as "untrackable".
 */
export function normalizeDocKey(raw: string | null | undefined): string {
  if (!raw) return "";
  const id = raw.trim();
  if (/^https?:/i.test(id)) {
    const hash = id.indexOf("#");
    return hash >= 0 ? id.slice(0, hash) : id;
  }
  return id;
}

/**
 * Bind the revision persistence logic to a storage backend. The host calls this
 * once with its adapter and passes the result to `<RevisionProvider store=…>`.
 *
 * All reads/writes go through the adapter; all mutations are serialized per
 * storage key (chrome.storage and friends have no atomic read-modify-write, so
 * two concurrent appends — or an append racing a clear — would otherwise each
 * read the same list and clobber the other, duplicating or resurrecting
 * revisions). The queue lives in this closure, so each store instance has its
 * own.
 */
export function createRevisionStore(storage: RevisionStorageAdapter): RevisionStore {
  // --- low-level helpers (adapter-backed, never throw) ---
  const getRaw = async <T>(key: string, fallback: T): Promise<T> => {
    try {
      const v = await storage.get(key);
      return v == null ? fallback : (v as T);
    } catch {
      return fallback;
    }
  };
  const setRaw = async (key: string, value: unknown): Promise<void> => {
    try {
      await storage.set(key, value);
    } catch {
      /* storage denied (sandboxed context, etc.) — degrade quietly */
    }
  };
  const removeRaw = async (key: string): Promise<void> => {
    try {
      await storage.remove(key);
    } catch {
      /* degrade quietly */
    }
  };

  // Per-key write serialization (see the factory doc comment for why).
  const writeQueues = new Map<string, Promise<unknown>>();
  const enqueue = <T>(key: string, op: () => Promise<T>): Promise<T> => {
    const prev = writeQueues.get(key) ?? Promise.resolve();
    const next = prev.then(op, op);
    // Keep the chain alive but swallow rejections so one failure doesn't wedge
    // the queue for that key.
    writeQueues.set(
      key,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  };

  // --- tracked set ---
  const listTracked: RevisionStore["listTracked"] = async () => {
    const list = await getRaw<unknown>(TRACKED_KEY, []);
    return Array.isArray(list) ? (list.filter((x) => typeof x === "string") as string[]) : [];
  };

  const isTracked: RevisionStore["isTracked"] = async (docKey) => {
    if (!docKey) return false;
    return (await listTracked()).includes(docKey);
  };

  const track: RevisionStore["track"] = async (docKey) => {
    if (!docKey) return;
    const current = await listTracked();
    if (current.includes(docKey)) return;
    await setRaw(TRACKED_KEY, [...current, docKey]);
  };

  const untrack: RevisionStore["untrack"] = async (docKey) => {
    if (!docKey) return;
    const current = await listTracked();
    if (!current.includes(docKey)) return;
    await setRaw(
      TRACKED_KEY,
      current.filter((k) => k !== docKey),
    );
  };

  // --- revision lists ---
  const listRevisions: RevisionStore["listRevisions"] = async (docKey) => {
    if (!docKey) return [];
    const list = await getRaw<unknown>(revKey(docKey), []);
    return Array.isArray(list) ? (list as Revision[]) : [];
  };

  const latestRevision: RevisionStore["latestRevision"] = async (docKey) => {
    const list = await listRevisions(docKey);
    return list.length ? list[list.length - 1]! : null;
  };

  const appendRevision: RevisionStore["appendRevision"] = async (docKey, content, now) => {
    if (!docKey) return null;
    // Empty content is never a revision (guards stray "" captures during loads).
    if (!content) return null;
    // Serialized: the read + dedup + write run atomically vs other mutations.
    return enqueue<AppendResult | null>(revKey(docKey), async () => {
      const list = await listRevisions(docKey);
      const hash = hashContent(content);
      const latest = list.length ? list[list.length - 1]! : null;
      // Dedup: identical to the latest revision → no-op (this is what makes a
      // reload of an unchanged doc add nothing).
      if (latest && latest.hash === hash) {
        return { added: false, revision: latest };
      }
      // Next id = max existing numeric id + 1 (monotonic, survives trims).
      const maxId = list.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
      const revision: Revision = { id: String(maxId + 1), hash, content, capturedAt: now };
      const next = [...list, revision].slice(-MAX_REVISIONS);
      await setRaw(revKey(docKey), next);
      return { added: true, revision };
    });
  };

  const clearRevisions: RevisionStore["clearRevisions"] = async (docKey) => {
    if (!docKey) return;
    await enqueue(revKey(docKey), () => removeRaw(revKey(docKey)));
  };

  // --- per-doc UI state ---
  const loadUiState: RevisionStore["loadUiState"] = async (docKey) => {
    if (!docKey) return null;
    const v = await getRaw<RevisionUiState | null>(uiKey(docKey), null);
    return v && typeof v === "object" ? v : null;
  };

  const saveUiState: RevisionStore["saveUiState"] = async (docKey, state) => {
    if (!docKey) return;
    await setRaw(uiKey(docKey), state);
  };

  return {
    listTracked,
    isTracked,
    track,
    untrack,
    listRevisions,
    latestRevision,
    appendRevision,
    clearRevisions,
    loadUiState,
    saveUiState,
  };
}
