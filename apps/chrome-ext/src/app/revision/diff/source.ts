// REVISION MODE — source (line) diff (feature map: revision/RevisionProvider.tsx).
//
// Pure jsdiff line diff → two render-ready shapes: a UNIFIED (stacked) row list
// and a SPLIT (side-by-side) row list. No @pierre/diffs — that pulls a worker
// pool + Shiki and risks MV3's no-eval CSP; jsdiff is pure JS. See ADR REV-2 in
// docsi/REVISION_PLAN.md.
//
// This module is host-agnostic (no React, no chrome.*, no DOM) — just text in,
// data out — so it's unit-testable and portable.
import { diffLines } from "diff";

/** A line's role in the diff. */
export type LineType = "context" | "add" | "del";

/** One row of the unified (stacked) view. Line numbers are 1-based; the side
 *  that doesn't exist for this row (e.g. `newNo` on a deletion) is null. */
export interface UnifiedRow {
  type: LineType;
  oldNo: number | null;
  newNo: number | null;
  text: string;
}

/** One row of the split (side-by-side) view: an old-side cell and a new-side
 *  cell, either of which may be absent (null) when lines don't pair up. */
export interface SplitRow {
  left: { no: number; text: string; type: "context" | "del" } | null;
  right: { no: number; text: string; type: "context" | "add" } | null;
}

export interface SourceDiffResult {
  unified: UnifiedRow[];
  split: SplitRow[];
  /** False when the two inputs are identical (no add/del lines). */
  changed: boolean;
  /** Counts for a summary header. */
  added: number;
  removed: number;
}

/** Split a jsdiff chunk value into individual lines, dropping the single
 *  trailing "" that a value ending in "\n" produces (so we don't render a
 *  phantom blank line per chunk). */
function toLines(value: string): string[] {
  const lines = value.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/**
 * Diff `before` → `after` at line granularity and return both view shapes.
 *
 * Pairing for the split view: jsdiff emits a removed chunk immediately followed
 * by an added chunk for a modified region, so we buffer del/add runs and zip
 * them row-by-row (del[i] ↔ add[i]); leftover dels get an empty right cell and
 * leftover adds an empty left cell. Context lines flush the buffer aligned on
 * both sides.
 */
export function buildSourceDiff(before: string, after: string): SourceDiffResult {
  const changes = diffLines(before ?? "", after ?? "");

  const unified: UnifiedRow[] = [];
  const split: SplitRow[] = [];
  let oldNo = 0;
  let newNo = 0;
  let added = 0;
  let removed = 0;

  // Buffers for the current modified region (del run + add run), flushed when
  // we hit context or the end.
  let delBuf: { no: number; text: string }[] = [];
  let addBuf: { no: number; text: string }[] = [];

  const flush = () => {
    const n = Math.max(delBuf.length, addBuf.length);
    for (let i = 0; i < n; i++) {
      const d = delBuf[i] ?? null;
      const a = addBuf[i] ?? null;
      split.push({
        left: d ? { no: d.no, text: d.text, type: "del" } : null,
        right: a ? { no: a.no, text: a.text, type: "add" } : null,
      });
    }
    delBuf = [];
    addBuf = [];
  };

  for (const change of changes) {
    const lines = toLines(change.value);
    if (change.added) {
      for (const text of lines) {
        newNo += 1;
        added += 1;
        unified.push({ type: "add", oldNo: null, newNo, text });
        addBuf.push({ no: newNo, text });
      }
    } else if (change.removed) {
      for (const text of lines) {
        oldNo += 1;
        removed += 1;
        unified.push({ type: "del", oldNo, newNo: null, text });
        delBuf.push({ no: oldNo, text });
      }
    } else {
      // Context — close any pending modified region, then emit aligned rows.
      flush();
      for (const text of lines) {
        oldNo += 1;
        newNo += 1;
        unified.push({ type: "context", oldNo, newNo, text });
        split.push({
          left: { no: oldNo, text, type: "context" },
          right: { no: newNo, text, type: "context" },
        });
      }
    }
  }
  flush();

  return { unified, split, changed: added + removed > 0, added, removed };
}
