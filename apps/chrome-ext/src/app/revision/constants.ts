// REVISION MODE — tunable constants (feature map: revision/RevisionProvider.tsx).
// Single home for the magic numbers/strings so nothing is hardcoded inline.

/** How many revisions we keep per doc. This is a "review what just changed"
 *  buffer, NOT an archive — on append we drop the oldest beyond this. */
export const MAX_REVISIONS = 5;

/** Storage key holding the set of doc keys currently in revision mode
 *  (persisted via the adapter so the flag survives an injected viewer's reload). */
export const TRACKED_KEY = "fv:rev:tracked";

/** Prefix for per-doc revision lists: `${REV_KEY_PREFIX}${docKey}`. */
export const REV_KEY_PREFIX = "fv:rev:doc:";

/** Storage key for one doc's revision list. */
export const revKey = (docKey: string): string => `${REV_KEY_PREFIX}${docKey}`;

/** Prefix for per-doc UI state (panel open, inline preview, diff toggles) so it
 *  survives a reload. */
export const UI_KEY_PREFIX = "fv:rev:ui:";

/** Storage key for one doc's UI state. */
export const uiKey = (docKey: string): string => `${UI_KEY_PREFIX}${docKey}`;

/** Large-doc guard: above this combined (before+after) character count for a
 *  single modified block, the reading diff skips the O(n·m) word/cell diff and
 *  falls back to a whole-block before+after render (still correct, just coarser
 *  — avoids pathological CPU on huge edited blocks). */
export const INTRA_BLOCK_DIFF_MAX_CHARS = 20_000;

/** Marks an element in a diff as the start of a change, for jump-to-next. */
export const DIFF_CHANGE_ATTR = "data-diff-change";

/** Inline-preview modes for a revision shown in the main viewer. Closed set —
 *  reference these, never the bare string. */
export const PREVIEW_MODE = { render: "render", diff: "diff" } as const;
export type PreviewMode = (typeof PREVIEW_MODE)[keyof typeof PREVIEW_MODE];

/** Source-diff layouts. `unified` = stacked (one column), `split` = side-by-side. */
export const SOURCE_DIFF_MODE = { unified: "unified", split: "split" } as const;
export type SourceDiffMode = (typeof SOURCE_DIFF_MODE)[keyof typeof SOURCE_DIFF_MODE];

/** Diff lens. `reading` = rendered markdown, `source` = raw markdown lines. */
export const DIFF_VIEW = { reading: "reading", source: "source" } as const;
export type DiffView = (typeof DIFF_VIEW)[keyof typeof DIFF_VIEW];

/** Default diff-pane settings (also the fallback when none is persisted). */
export const DEFAULT_DIFF_SETTINGS: {
  view: DiffView;
  mode: SourceDiffMode;
  onlyChanges: boolean;
} = {
  view: DIFF_VIEW.reading,
  mode: SOURCE_DIFF_MODE.split,
  onlyChanges: true,
};
