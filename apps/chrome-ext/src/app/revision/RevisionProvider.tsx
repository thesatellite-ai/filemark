// =============================================================================
// REVISION MODE — feature hub (read this first)
// =============================================================================
// Cache a doc in the browser; on every render of a TRACKED doc, snapshot a
// revision if the content changed (hash dedup, last 5 kept); then diff so you
// review only what an AI just changed instead of re-reading the whole doc.
// Read-only (no restore), MV3-safe, persistence injected (portable).
//
// FILE MAP (everything for this feature):
//   revision/RevisionProvider.tsx   — THIS FILE. Context + capture-on-render.
//                                     Owns tracked-state + the revisions list;
//                                     the single source of truth (useRevision()).
//   revision/store.ts               — PORTABLE persistence core: createRevisionStore
//                                     (adapter-injected), tracked set + ring buffer.
//   revision/adapters/chromeStorage — the chrome.storage binding (the only chrome.*).
//   revision/hash.ts                — pure FNV-1a content checksum (dedup key).
//   revision/compare.ts / time.ts   — pure node/default-pair + relative-time helpers.
//   revision/constants.ts           — MAX_REVISIONS, storage keys, mode constants.
//   revision/types.ts               — Revision + store + context/prop types.
//   revision/RevisionBar.tsx        — status strip (count + last-changed + actions).
//   revision/RevisionPanel.tsx      — history list + inline-preview triggers.
//   revision/RevisionPreview.tsx    — read-only inline preview / diff in the viewer.
//   revision/RevisionDiffView.tsx   — full-screen compare overlay.
//   revision/diff/**                — source (jsdiff) + reading (block/word/table) diffs.
//
// INTEGRATION POINTS (outside revision/):
//   app/revisionStore.ts  — builds the store with the chrome adapter (composition root).
//   app/shell/Shell.tsx   — wraps the shell in <RevisionProvider store=…>, mounts the UI.
//   app/shell/TopBar.tsx  — History toolbar button → toggleTracked().
//
// WHY CAPTURE ON RENDER (not on the auto-refresh poll): render is the one hook
// every source shares — file://, folder, drag-drop, AND a direct URL render
// (raw gist). A reload re-fetches → renders; the auto-refresh poll re-reads →
// renders. Both funnel through a `content` change here. The injected viewer is
// a fresh page each reload, so the tracked flag must be PERSISTED (store.ts),
// not React state — which is why this provider reads it from the store on
// mount. See ADR REV-3 in docsi/REVISION_PLAN.md.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { normalizeDocKey } from "./store";
import { PREVIEW_MODE, DEFAULT_DIFF_SETTINGS, type PreviewMode } from "./constants";
import type { DiffSettings, Revision, RevisionApi, RevisionProviderProps } from "./types";

const RevisionContext = createContext<RevisionApi | null>(null);

/** How long the "just captured a new revision" flag stays set (ms). */
const JUST_CAPTURED_MS = 2500;

/** Settling delay before a render captures — collapses the load-time content
 *  transition (store fallback → live text) into a single capture. */
const CAPTURE_DEBOUNCE_MS = 600;

export function RevisionProvider({
  store,
  docKey,
  content,
  renderMarkdown,
  children,
}: RevisionProviderProps) {
  // Normalized identity of the active doc — the storage key. Recomputed only
  // when the raw docKey changes.
  const normalizedKey = useMemo(() => normalizeDocKey(docKey), [docKey]);

  const [tracked, setTracked] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [justCaptured, setJustCaptured] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [preview, setPreview] = useState<{ id: string; mode: PreviewMode } | null>(null);
  const [diffSettings, setDiffSettings] = useState<DiffSettings>(DEFAULT_DIFF_SETTINGS);
  // The docKey whose persisted UI state has been hydrated — gates the persist
  // effect so it doesn't overwrite saved state before restore completes.
  const hydratedKeyRef = useRef<string | null>(null);

  // Latest content/tracked in refs so the capture effect can read them without
  // re-subscribing (and so async appends use fresh values).
  const contentRef = useRef(content);
  contentRef.current = content;
  const trackedRef = useRef(tracked);
  trackedRef.current = tracked;
  const revisionsRef = useRef(revisions);
  revisionsRef.current = revisions;
  // The store is a host-created singleton; hold it in a ref so callbacks read it
  // without listing it as a dependency (it never changes for a given host).
  const storeRef = useRef(store);
  storeRef.current = store;
  const justCapturedTimer = useRef<number | undefined>(undefined);
  // Pending debounced-capture timer (cancellable by Clear).
  const captureTimer = useRef<number | undefined>(undefined);

  // Load tracked-state + revisions + persisted UI state whenever the active doc
  // changes. Everything is persisted, so a reload restores revision mode AND
  // exactly where you were: panel open, the inline preview (revision + mode),
  // and the diff display settings.
  useEffect(() => {
    let cancelled = false;
    // Mark un-hydrated for this key so the persist effect can't write until
    // restore finishes. Close the full-screen overlay (transient by design).
    hydratedKeyRef.current = null;
    setDiffOpen(false);
    if (!normalizedKey) {
      setTracked(false);
      setRevisions([]);
      setPanelOpen(false);
      setPreview(null);
      setDiffSettings(DEFAULT_DIFF_SETTINGS);
      return;
    }
    void Promise.all([
      storeRef.current.isTracked(normalizedKey),
      storeRef.current.listRevisions(normalizedKey),
      storeRef.current.loadUiState(normalizedKey),
    ]).then(([t, revs, ui]) => {
      if (cancelled) return;
      setTracked(t);
      setRevisions(revs);
      setPanelOpen(ui?.panelOpen ?? false);
      setDiffSettings(ui?.diff ?? DEFAULT_DIFF_SETTINGS);
      // Restore the inline preview only if its revision still exists.
      const savedPreview = ui?.preview ?? null;
      const previewValid =
        savedPreview !== null && revs.some((r) => r.id === savedPreview.id);
      setPreview(previewValid ? savedPreview : null);
      hydratedKeyRef.current = normalizedKey;
    });
    return () => {
      cancelled = true;
    };
  }, [normalizedKey]);

  // Persist UI state whenever it changes — but only after this doc's state has
  // been hydrated (so we never clobber saved state with the initial defaults).
  useEffect(() => {
    if (!normalizedKey || hydratedKeyRef.current !== normalizedKey) return;
    void storeRef.current.saveUiState(normalizedKey, { panelOpen, preview, diff: diffSettings });
  }, [normalizedKey, panelOpen, preview, diffSettings]);

  // Append a revision (deduped) and reflect the result in local state. Shared
  // by the capture-on-render effect, manual snapshot, and enable-baseline.
  const capture = useCallback(async (key: string, text: string) => {
    if (!key || !text) return;
    // The store honors a persisted Clear (won't recreate a baseline for the
    // exact cleared content, across reloads) — no in-memory guard needed here.
    const result = await storeRef.current.appendRevision(key, text, Date.now());
    if (!result) return;
    if (result.added) {
      const revs = await storeRef.current.listRevisions(key);
      setRevisions(revs);
      setJustCaptured(true);
      window.clearTimeout(justCapturedTimer.current);
      justCapturedTimer.current = window.setTimeout(
        () => setJustCaptured(false),
        JUST_CAPTURED_MS,
      );
    }
  }, []);

  // Capture-on-render, DEBOUNCED: during a load the `content` prop transitions
  // (store fallback → live text published by the Viewer), which would fire two
  // concurrent captures. Debouncing collapses those into one capture of the
  // settled content — so a reload of an unchanged doc dedups to nothing instead
  // of incrementing the count on every page load.
  useEffect(() => {
    if (!tracked || !normalizedKey || !content) return;
    const id = window.setTimeout(() => {
      void capture(normalizedKey, content);
    }, CAPTURE_DEBOUNCE_MS);
    captureTimer.current = id;
    return () => window.clearTimeout(id);
  }, [tracked, normalizedKey, content, capture]);

  const toggleTracked = useCallback(() => {
    if (!normalizedKey) return;
    if (trackedRef.current) {
      setTracked(false);
      setDiffOpen(false);
      void storeRef.current.untrack(normalizedKey);
    } else {
      setTracked(true);
      void storeRef.current.track(normalizedKey);
      // Fresh enable — capture a baseline immediately so there's something to
      // diff the next edit against.
      void capture(normalizedKey, contentRef.current);
    }
  }, [normalizedKey, capture]);

  const snapshotNow = useCallback(() => {
    if (!normalizedKey) return;
    void capture(normalizedKey, contentRef.current);
  }, [normalizedKey, capture]);

  const clearHistory = useCallback(() => {
    if (!normalizedKey) return;
    // Reset history to a single fresh baseline of the current content: cancel
    // any pending capture, wipe, then re-capture now. This keeps the first
    // subsequent edit diffable (baseline → edit) and avoids the confusing
    // "empty first revision" — Clear means "start over from what's on screen".
    window.clearTimeout(captureTimer.current);
    setRevisions([]);
    setDiffOpen(false);
    void storeRef.current.clearRevisions(normalizedKey).then(() => {
      void capture(normalizedKey, contentRef.current);
    });
  }, [normalizedKey, capture]);

  const openDiff = useCallback(() => {
    // One stored revision is enough — we diff it against the live "Current"
    // content. (RevisionDiffView appends Current as the newest node.)
    if (revisionsRef.current.length >= 1) setDiffOpen(true);
  }, []);

  const closeDiff = useCallback(() => setDiffOpen(false), []);

  const togglePanel = useCallback(() => setPanelOpen((v) => !v), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  const previewRevision = useCallback(
    (id: string) => setPreview({ id, mode: PREVIEW_MODE.render }),
    [],
  );
  const diffRevisionInline = useCallback(
    (id: string) => setPreview({ id, mode: PREVIEW_MODE.diff }),
    [],
  );
  const exitPreview = useCallback(() => setPreview(null), []);

  useEffect(
    () => () => {
      window.clearTimeout(justCapturedTimer.current);
      window.clearTimeout(captureTimer.current);
    },
    [],
  );

  const lastChangedAt = revisions.length
    ? revisions[revisions.length - 1]!.capturedAt
    : null;

  const api = useMemo<RevisionApi>(
    () => ({
      tracked,
      revisions,
      currentContent: content,
      lastChangedAt,
      justCaptured,
      diffOpen,
      openDiff,
      closeDiff,
      panelOpen,
      togglePanel,
      closePanel,
      diffSettings,
      setDiffSettings,
      renderMarkdown: renderMarkdown ?? null,
      preview,
      previewRevision,
      diffRevisionInline,
      exitPreview,
      toggleTracked,
      snapshotNow,
      clearHistory,
    }),
    [
      tracked,
      revisions,
      content,
      lastChangedAt,
      justCaptured,
      diffOpen,
      openDiff,
      closeDiff,
      panelOpen,
      togglePanel,
      closePanel,
      diffSettings,
      renderMarkdown,
      preview,
      previewRevision,
      diffRevisionInline,
      exitPreview,
      toggleTracked,
      snapshotNow,
      clearHistory,
    ],
  );

  return <RevisionContext.Provider value={api}>{children}</RevisionContext.Provider>;
}

export function useRevision(): RevisionApi {
  const ctx = useContext(RevisionContext);
  if (!ctx) throw new Error("useRevision must be used within <RevisionProvider>");
  return ctx;
}
