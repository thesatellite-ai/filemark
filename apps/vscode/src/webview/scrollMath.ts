// Pure line↔offset interpolation for scroll sync, split out from scrollSync.ts
// (which owns the DOM: collecting anchors, resolving the scroll container). This
// module has zero DOM dependency so the mapping — the subtle part — is unit
// testable in isolation.

/** A rendered block's source line paired with its offset in the scroll
 *  container's content coordinates. */
export interface LineMark {
  /** 1-based source line (post-frontmatter body) from `data-line`. */
  line: number;
  /** Element top, in scroller-content coordinates (scroll-independent). */
  top: number;
}

/**
 * Content-Y for a (possibly fractional) source `line`, interpolated linearly
 * between the two anchors that bracket it. Returns null when there are no
 * anchors. `marks` MUST be sorted by `top` ascending (as collectMarks yields).
 *
 * Used for editor→preview: given the editor's top line, where should the preview
 * scroll to. Exact at an anchor line; approximate between anchors (linear in
 * source line), which is what VS Code's own Markdown preview does too.
 */
export function topForLine(
  marks: readonly LineMark[],
  line: number,
): number | null {
  if (marks.length === 0) return null;
  let before = marks[0];
  let after = marks[marks.length - 1];
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].line <= line) before = marks[i];
    if (marks[i].line >= line) {
      after = marks[i];
      break;
    }
  }
  if (after.line === before.line) return before.top;
  const frac = (line - before.line) / (after.line - before.line);
  return before.top + frac * (after.top - before.top);
}

/**
 * Inverse of {@link topForLine}: the (fractional) source line rendered at
 * content-Y `y`. Returns null when there are no anchors. `marks` MUST be sorted
 * by `top` ascending.
 *
 * Used for preview→editor (report the top line as the user scrolls) and for
 * double-click dead-space fallback (line at the clicked Y).
 */
export function lineAtY(marks: readonly LineMark[], y: number): number | null {
  if (marks.length === 0) return null;
  let before = marks[0];
  let after = marks[0];
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].top <= y + 1) {
      before = marks[i];
      after = marks[i + 1] ?? marks[i];
    } else {
      break;
    }
  }
  if (after.top === before.top) return before.line;
  const frac = (y - before.top) / (after.top - before.top);
  return before.line + frac * (after.line - before.line);
}
