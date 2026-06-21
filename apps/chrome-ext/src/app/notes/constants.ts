// AI REVIEW NOTES — tunable constants (feature map: notes/NotesContext.tsx).
// Single place for the magic numbers/strings so behaviour is adjustable and
// nothing is hardcoded inline.

/** CSS Custom Highlight registry name for persistent note highlights.
 *  Styled by the host via `::highlight(fv-note)`. */
export const HIGHLIGHT_NAME = "fv-note";

/** CSS Custom Highlight registry name for the transient click/navigate flash.
 *  Styled by the host via `::highlight(fv-note-active)`. */
export const ACTIVE_HIGHLIGHT_NAME = "fv-note-active";

/** Class applied to the rendered markdown body — the only DOM the notes
 *  feature reads selections from. */
export const BODY_SELECTOR = ".fv-mdx-body";

/** How long the click/navigate flash stays painted before it's removed (ms). */
export const FLASH_DURATION_MS = 1400;

/** How long a note stays flagged "active" so the panel can scroll + ring it,
 *  before the flag auto-clears (ms). */
export const ACTIVE_NOTE_DURATION_MS = 1600;

/** Minimum trimmed selection length before offering the "+ Note" button. */
export const MIN_SELECTION_LENGTH = 2;

/** Source-line text-search fallback: progressively shorter quote prefixes to
 *  try so a partial/formatted match still resolves to a line. */
export const LINE_SEARCH_PREFIX_LENGTHS = [48, 28, 14] as const;

/** Minimum needle length for the line text-search (avoid spurious matches). */
export const LINE_SEARCH_MIN_NEEDLE = 6;

/** Source-line attributes stamped by remarkSourceLine (@filemark/mdx). */
export const DATA_LINE_ATTR = "data-line";
export const DATA_LINE_END_ATTR = "data-line-end";

/** Selector for headings, used to resolve a selection's section. */
export const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";

/** Fallback document name in the export header when none is provided. */
export const DEFAULT_FILE_NAME = "document.md";
