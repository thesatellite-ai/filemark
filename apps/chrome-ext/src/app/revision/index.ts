// REVISION MODE — public API.
//
// Cache a doc in the browser, snapshot a revision on every changed render
// (hash dedup, last 5 kept), then diff so you review only what an AI just
// changed instead of re-reading the whole doc. Read-only (no restore), MV3-safe.
//
// PORTABLE BY DESIGN: the only host dependency is persistence, injected as a
// RevisionStorageAdapter. Build the store once with your adapter and pass it to
// the provider — the same feature then runs in any host. This app uses the
// bundled chrome.storage adapter; another project can supply its own.
//
// Design + decisions: docsi/REVISION_PLAN.md. Tasks: docsi/TASKS.md (M-REVISION).
//
// Host wiring:
//   const store = createRevisionStore(createChromeRevisionStorage());
//   <RevisionProvider store={store} docKey={docIdentity} content={rawMarkdown}>
//     <RevisionBar />          // status strip when tracked
//     …viewer / <RevisionPreview /> …
//     <RevisionPanel />        // history list (toggle open)
//     <RevisionDiffView />     // full-screen compare overlay
//   </RevisionProvider>
// plus a toolbar control calling useRevision().toggleTracked() / togglePanel().

// — React surface —
export { RevisionProvider, useRevision } from "./RevisionProvider";
export { RevisionBar } from "./RevisionBar";
export { RevisionDiffView } from "./RevisionDiffView";
export { RevisionPanel } from "./RevisionPanel";
export { RevisionPreview } from "./RevisionPreview";

// — diff engine (host-agnostic) —
export { ReadingDiff } from "./diff/reading/ReadingDiff";
export { SourceDiff } from "./diff/SourceDiff";
export { buildSourceDiff } from "./diff/source";

// — persistence: build a store from an injected adapter, or use the chrome one —
export { createRevisionStore, normalizeDocKey } from "./store";
export { createChromeRevisionStorage } from "./adapters/chromeStorage";

// — pure helpers —
export { hashContent } from "./hash";
export { formatRelativeTime } from "./time";
export { MAX_REVISIONS, PREVIEW_MODE, SOURCE_DIFF_MODE } from "./constants";

// — types —
export type {
  Revision,
  RevisionApi,
  RevisionProviderProps,
  RevisionStore,
  RevisionStorageAdapter,
  AppendResult,
} from "./types";
export type { PreviewMode, SourceDiffMode } from "./constants";
