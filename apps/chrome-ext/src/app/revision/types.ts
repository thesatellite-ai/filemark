// REVISION MODE — shared types (feature map: revision/RevisionProvider.tsx).
import type { ReactNode } from "react";
import type { PreviewMode, DiffView, SourceDiffMode } from "./constants";

/** Diff-pane display settings (the Reading/Source lens + its sub-toggles).
 *  Persisted per doc so a reload restores how you were looking at the diff. */
export interface DiffSettings {
  view: DiffView;
  mode: SourceDiffMode;
  onlyChanges: boolean;
}

/** Per-doc UI state persisted across reloads: whether the history panel was
 *  open, which revision was being previewed inline (and how), and the diff
 *  display settings. */
export interface RevisionUiState {
  panelOpen: boolean;
  preview: { id: string; mode: PreviewMode } | null;
  diff: DiffSettings;
}

/**
 * One cached snapshot of a doc's content. Stored in chrome.storage.local (per
 * doc, last 5 kept). Full text is held because markdown is small and the diff
 * engine needs both sides verbatim — no patch reconstruction.
 */
export interface Revision {
  /** Monotonic per-doc id (string form of an incrementing counter). */
  id: string;
  /** Content checksum (FNV-1a) — the dedup key vs the previous revision. */
  hash: string;
  /** Full markdown snapshot at capture time. */
  content: string;
  /** Capture time, epoch ms. */
  capturedAt: number;
}

/**
 * Pluggable persistence backend — the ONLY host-specific dependency of the
 * revision feature. Implement this over whatever a host has (chrome.storage,
 * localStorage, a VS Code Memento, an in-memory map for tests) and pass the
 * resulting store to the provider. Keeping it an interface is what makes the
 * whole feature portable across projects.
 *
 * Contract: values are JSON-serializable; `get` resolves `undefined` for a
 * missing key; implementations should never throw (degrade quietly) so revision
 * mode can't break the host.
 */
export interface RevisionStorageAdapter {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Result of an append attempt — `added` is false when the content was
 *  identical to the latest revision (the dedup short-circuit). */
export interface AppendResult {
  added: boolean;
  revision: Revision;
}

/**
 * The persistence API the provider consumes, bound to a storage adapter via
 * `createRevisionStore`. Host-agnostic: no chrome.*, no DOM. Methods are
 * serialized per doc internally so concurrent appends/clears can't clobber.
 */
export interface RevisionStore {
  /** Doc keys currently in revision mode. */
  listTracked(): Promise<string[]>;
  /** Whether a doc is in revision mode. */
  isTracked(docKey: string): Promise<boolean>;
  /** Put a doc into revision mode (idempotent). */
  track(docKey: string): Promise<void>;
  /** Take a doc out of revision mode (keeps its captured revisions). */
  untrack(docKey: string): Promise<void>;
  /** A doc's revisions, oldest → newest. */
  listRevisions(docKey: string): Promise<Revision[]>;
  /** The latest revision for a doc, or null. */
  latestRevision(docKey: string): Promise<Revision | null>;
  /**
   * Capture content as a new revision (trims to the cap).
   * Deduped vs the latest revision by default (so reloads of an unchanged doc
   * add nothing). Pass `force` for a deliberate manual snapshot — it bypasses
   * dedup and always pins a checkpoint, even if content is unchanged.
   */
  appendRevision(
    docKey: string,
    content: string,
    now: number,
    force?: boolean,
  ): Promise<AppendResult | null>;
  /** Delete all revisions for a doc (keeps the tracked flag). */
  clearRevisions(docKey: string): Promise<void>;
  /** Load a doc's persisted UI state, or null if none saved. */
  loadUiState(docKey: string): Promise<RevisionUiState | null>;
  /** Persist a doc's UI state. */
  saveUiState(docKey: string, state: RevisionUiState): Promise<void>;
}

/**
 * Host integration for the provider. Host-agnostic — it takes the active doc's
 * stable identity + current content via props and a storage-backed `store`, so
 * it drops into any host (chrome-ext, VS Code webview, a web app). `docKey` is
 * normalized inside.
 */
export interface RevisionProviderProps {
  /** Persistence, created once by the host via `createRevisionStore(adapter)`. */
  store: RevisionStore;
  /** Optional full-fidelity markdown renderer for the inline preview. Pass the
   *  host's real renderer (e.g. MDXViewer) so a previewed revision looks exactly
   *  like the live doc; omit to use the built-in lightweight fallback. */
  renderMarkdown?: (content: string) => ReactNode;
  /** Stable identity of the active doc (sourceUrl / file:// path / id). Empty
   *  string = nothing active. Normalized internally via `normalizeDocKey`. */
  docKey: string;
  /** Current rendered markdown — the capture source. Each change to this while
   *  tracked appends a revision (deduped by hash). */
  content: string;
  children: ReactNode;
}

/** The revision context value — consumed by the bar + diff UI via `useRevision()`. */
export interface RevisionApi {
  /** Whether the active doc is in revision mode (persisted, survives reloads). */
  tracked: boolean;
  /** This doc's captured revisions, oldest → newest (≤ MAX_REVISIONS). */
  revisions: Revision[];
  /** The live on-screen content — used as the newest ("Current") comparison
   *  point so a diff is possible with a single stored revision. */
  currentContent: string;
  /** Capture time of the newest revision, epoch ms, or null if none. */
  lastChangedAt: number | null;
  /** True briefly after a render just captured a NEW revision (for a "changed"
   *  nudge). Auto-clears. */
  justCaptured: boolean;
  /** Whether the diff view is open. */
  diffOpen: boolean;
  /** Open the diff view (no-op with < 2 revisions). */
  openDiff(): void;
  /** Close the diff view. */
  closeDiff(): void;

  /** Whether the history side panel is open. */
  panelOpen: boolean;
  /** Toggle the history side panel. */
  togglePanel(): void;
  /** Close the history side panel. */
  closePanel(): void;

  /** Diff-pane display settings (Reading/Source + layout + only-changes),
   *  persisted per doc. Shared by the overlay and inline diff. */
  diffSettings: DiffSettings;
  /** Update the diff display settings (persisted). */
  setDiffSettings(next: DiffSettings): void;
  /** Host-supplied full-fidelity markdown renderer (e.g. the app's MDXViewer),
   *  used for the inline preview's "Rendered" mode so it matches the normal
   *  viewer (frontmatter card, callouts, components). Null → the built-in
   *  lightweight react-markdown fallback. */
  renderMarkdown: ((content: string) => ReactNode) | null;
  /** Active inline preview in the MAIN viewer (read-only), or null for the live
   *  doc. `mode` = render the revision's content, or show its diff vs the
   *  previous revision. */
  preview: { id: string; mode: PreviewMode } | null;
  /** Render a stored revision read-only in the main viewer. */
  previewRevision(id: string): void;
  /** Show a stored revision's diff (vs the previous revision) in the main viewer. */
  diffRevisionInline(id: string): void;
  /** Exit inline preview, returning to the live doc. */
  exitPreview(): void;
  /** Enter/exit revision mode for the active doc. Entering captures a baseline. */
  toggleTracked(): void;
  /** Manually capture the current content now (deduped) — the fallback for
   *  sources that don't re-render on their own (drag-dropped files). */
  snapshotNow(): void;
  /** Delete all captured revisions for the active doc (stays tracked). */
  clearHistory(): void;
}
