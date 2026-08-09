// Shared constants used by BOTH the extension host (Node) and the webview
// (browser). Kept in one place so a value can't drift between the two sides —
// e.g. the host clamps an incoming zoom and the webview clamps an outgoing one;
// they must agree exactly.

import type { ViewMode } from "./messages";

/** Preview zoom multiplier bounds + step. 1 = 100%. */
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.1;
/** Default zoom when nothing is stored. */
export const DEFAULT_ZOOM = 1;

/**
 * Clamp a zoom value into [ZOOM_MIN, ZOOM_MAX] and snap it to one-decimal steps.
 * Snapping guarantees 100% (1.0) is always exactly reachable via +/- steps and
 * that a stored/garbage value can never produce a broken layout. Pure — safe to
 * call on either side of the host↔webview boundary.
 */
export function clampZoom(zoom: number): number {
  const snapped = Math.round(zoom * 10) / 10;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, snapped));
}

/**
 * File extensions (no leading dot, lowercase) rendered by the CSV data-grid
 * viewer instead of markdown. Closed set — THREE places key on these exact two
 * and must stay in sync: this constant (webview renderer choice), the preview
 * `when` clauses in package.json (`…LangId =~ /^(csv|tsv)$/`), and the
 * `csv`/`tsv` language contributions there. Add an extension → update all three.
 */
export const CSV_EXTENSIONS = ["csv", "tsv"] as const;
export type CsvExtension = (typeof CSV_EXTENSIONS)[number];

/** The one ViewMode that renders the GitHub-flavored approximation. Named so the
 *  render decision never compares against a bare "github" literal. */
export const GITHUB_VIEW_MODE: ViewMode = "github";

/** Case-insensitive test that `ext` (no leading dot) is a CSV/TSV extension. */
export function isCsvExtension(ext: string): ext is CsvExtension {
  return (CSV_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

/**
 * The viewer the webview should mount for the active document. A closed
 * discriminated set so the App's render switch is exhaustive — adding a kind
 * here forces a compile error at the switch until it's handled.
 *   • "markdown"      — the rich MDX viewer (default)
 *   • "github"        — GitHub-flavored preview (markdown files, github mode)
 *   • "csv"           — the sortable/filterable data grid (.csv/.tsv)
 *   • "csv-disabled"  — a note shown when CSV rendering is turned off
 */
export type PreviewRenderer = "markdown" | "github" | "csv" | "csv-disabled";

/**
 * Choose the preview renderer from the file extension + runtime settings.
 *
 * Why a pure function (not an inline JSX ternary): the choice has three inputs
 * (extension, view mode, the `enableCsv` toggle) and four outcomes including the
 * "CSV disabled" note — exactly the multi-way branch that rots silently when
 * buried in a component. Extracting it here makes it unit-testable and keeps
 * <App> declarative, and shares the CSV_EXTENSIONS source of truth.
 *
 * Invariants:
 *  • .csv/.tsv → "csv", or "csv-disabled" when the user turned CSV off. The
 *    markdown view modes (filemark/github) NEVER apply to a data grid.
 *  • any other extension → "github" when the runtime view mode is GitHub, else
 *    "markdown". (The host only offers the preview for markdown/csv/tsv, so other
 *    extensions don't reach here in practice — markdown is the safe default.)
 */
export function pickPreviewRenderer(
  ext: string,
  viewMode: ViewMode,
  enableCsv: boolean,
): PreviewRenderer {
  if (isCsvExtension(ext)) {
    return enableCsv ? "csv" : "csv-disabled";
  }
  return viewMode === GITHUB_VIEW_MODE ? "github" : "markdown";
}
