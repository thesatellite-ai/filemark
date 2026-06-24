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

  // 1) Exact match — fast path, with anchor disambiguation for repeated text.
  let best = -1;
  let bestDist = Infinity;
  let bestLen = quote.length;
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

  // 2) Whitespace-insensitive fallback. `selection.toString()` joins across
  //    block boundaries with newlines, but the flattened DOM text concatenates
  //    text nodes with NO separator (e.g. two paragraphs → "fooBar", selection
  //    → "foo\nBar"). It can also differ in whitespace amount. So the exact
  //    indexOf above fails for any multi-line / cross-block selection. We match
  //    on the whitespace-STRIPPED skeleton of both and map the hit back to real
  //    flat indices. (Stripping all whitespace — not collapsing to a space —
  //    is what makes the zero-separator block boundary match.)
  if (best < 0) {
    const proj = stripWhitespace(text);
    const needle = quote.replace(/\s+/g, "");
    if (needle) {
      let nFrom = 0;
      for (;;) {
        const ni = proj.norm.indexOf(needle, nFrom);
        if (ni < 0) break;
        const origStart = proj.map[ni]!;
        const d = Math.abs(origStart - anchorIndex);
        if (d < bestDist) {
          bestDist = d;
          best = origStart;
          // End maps from the last matched skeleton char back to the original.
          const lastOrig = proj.map[ni + needle.length - 1]!;
          bestLen = lastOrig - origStart + 1;
        }
        nFrom = ni + 1;
      }
    }
  }

  if (best < 0) return null;
  const a = pointAt(segs, best);
  const b = pointAt(segs, best + bestLen);
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

/** Strip ALL whitespace from `text`, returning the skeleton string plus a map
 *  from each skeleton index → original index (so a match in the skeleton maps
 *  back to real positions). Used to anchor a selection whose toString() carries
 *  newlines/whitespace the flattened DOM text doesn't. */
function stripWhitespace(text: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (!/\s/.test(ch)) {
      norm += ch;
      map.push(i);
    }
  }
  return { norm, map };
}

/** The active rendered-markdown body element, or null. */
export function getBody(): HTMLElement | null {
  return document.querySelector<HTMLElement>(BODY_SELECTOR);
}
