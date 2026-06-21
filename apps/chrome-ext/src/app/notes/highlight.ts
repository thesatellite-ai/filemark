// AI REVIEW NOTES — range/highlight helpers (feature map: notes/NotesContext.tsx).
//
// Pure, framework-free DOM helpers (no React, no host store) so they're easy to
// test and reuse. Range resolution for note highlights: a live DOM `Range` is
// fragile — when
// shiki re-highlights a code block (or React re-renders), the text nodes the
// range points at get detached and the CSS highlight stops painting. Instead
// we store the quoted text + an anchor offset and RE-RESOLVE a fresh Range
// from the current DOM whenever we (re)build the highlights. That survives any
// re-render because the text is re-found each time.

import { BODY_SELECTOR } from "./constants";

interface FlatSeg {
  node: Text;
  start: number;
}
interface Flat {
  text: string;
  segs: FlatSeg[];
}

/** Concatenate all text nodes under `body` into one string, remembering where
 *  each text node starts in that flat string. */
function buildFlat(body: HTMLElement): Flat {
  const segs: FlatSeg[] = [];
  let text = "";
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    segs.push({ node: t, start: text.length });
    text += t.data;
  }
  return { text, segs };
}

/** Map a flat-string index back to a (text node, offset) point. */
function pointAt(
  segs: FlatSeg[],
  index: number,
): { node: Text; offset: number } | null {
  // Last segment whose start <= index.
  let lo = 0;
  let hi = segs.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segs[mid]!.start <= index) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (found < 0) return null;
  const seg = segs[found]!;
  const offset = Math.min(index - seg.start, seg.node.data.length);
  return { node: seg.node, offset };
}

/** Flat-string index of a range's start within `body` (the note's anchor). */
export function anchorIndexOf(body: HTMLElement, range: Range): number {
  const { segs } = buildFlat(body);
  const target = range.startContainer;
  for (const seg of segs) {
    if (seg.node === target) return seg.start + range.startOffset;
  }
  return 0;
}

/**
 * Re-resolve a fresh Range for `quote` in the current `body`, choosing the
 * occurrence whose start is closest to `anchorIndex` (disambiguates repeated
 * text). Returns null if the text can't be found (e.g. it spanned block
 * boundaries — selection.toString() inserts newlines the DOM text doesn't).
 */
export function resolveRange(
  body: HTMLElement,
  quote: string,
  anchorIndex: number,
): Range | null {
  if (!quote) return null;
  const { text, segs } = buildFlat(body);
  let best = -1;
  let bestDist = Infinity;
  let from = 0;
  for (;;) {
    const i = text.indexOf(quote, from);
    if (i < 0) break;
    const d = Math.abs(i - anchorIndex);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
    from = i + 1;
  }
  if (best < 0) return null;
  const a = pointAt(segs, best);
  const b = pointAt(segs, best + quote.length);
  if (!a || !b) return null;
  try {
    const range = document.createRange();
    range.setStart(a.node, a.offset);
    range.setEnd(b.node, b.offset);
    return range;
  } catch {
    return null;
  }
}

/** The active rendered-markdown body element, or null. */
export function getBody(): HTMLElement | null {
  return document.querySelector<HTMLElement>(BODY_SELECTOR);
}
