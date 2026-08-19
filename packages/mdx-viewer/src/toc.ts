// Table-of-contents indentation logic. Kept as a standalone, host-agnostic
// module (no React, no DOM) so the depth→indent math is unit-testable in the
// node test env and can't drift from the component that renders it.

/** Pixels of horizontal indent per TOC nesting level (level 0 = flush-left). */
export const TOC_INDENT_STEP_PX = 10;

/**
 * Indent level for each heading, RELATIVE to the shallowest heading present.
 *
 * Why relative (not keyed to a fixed tag): the TOC collects h1–h4, but docs
 * disagree on their top level — some use `#` as the first section, others
 * reserve `#` for the page title and start sections at `##`. Keying indent on an
 * absolute tag (the old CSS made h2 flush-left) makes an h1 collide with h2 and
 * gives no hierarchy between `#` and `##`. Anchoring on the shallowest depth
 * that actually appears makes the outermost heading always flush-left and every
 * deeper one nest beneath it — correct whether the doc starts at h1, h2, or h3,
 * and identical to the previous good behavior for the common h2-first doc.
 *
 * Level = `depth − min(depths)` (0-based). A skipped level is preserved as a gap
 * (e.g. `#` then `###` with no `##` → the h3 sits two steps in), reflecting the
 * real heading structure rather than papering over the missing middle level.
 *
 * Pure + total: returns `[]` for empty input; never throws.
 */
export function tocIndentLevels(depths: number[]): number[] {
  if (depths.length === 0) return [];
  const minDepth = Math.min(...depths);
  return depths.map((depth) => depth - minDepth);
}
