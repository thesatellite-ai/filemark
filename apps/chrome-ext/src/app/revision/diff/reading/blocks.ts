// REVISION MODE — reading-diff block algorithms (feature map: revision/RevisionProvider.tsx).
//
// Pure, no React/DOM. Ported verbatim (logic-for-logic) from aicoder's
// ReadingDiff — splitting markdown into fence-aware blocks, classifying them,
// and LCS-pairing two block lists into same/add/del/MOD units so the renderer
// can diff INSIDE a modified pair. Unit-testable in isolation.
import { diffArrays } from "diff";

// ───────────────────────── block splitting ─────────────────────────

/**
 * Split markdown into top-level blocks. A blank line is a boundary, EXCEPT
 * inside a fenced code block (``` or ~~~), which stays atomic. Tight lists /
 * tables (no blank lines between rows) stay as one block.
 */
export function splitBlocks(src: string): string[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let buf: string[] = [];
  let inFence = false;
  let fenceChar = "";

  const flush = () => {
    const text = buf.join("\n").replace(/\s+$/, "");
    if (text.trim() !== "") blocks.push(text);
    buf = [];
  };

  for (const line of lines) {
    const fence = line.match(/^\s*(```+|~~~+)/);
    if (fence) {
      const ch = fence[1]![0]!;
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
        buf.push(line);
        continue;
      }
      if (line.trim().startsWith(fenceChar)) {
        inFence = false;
        buf.push(line);
        flush();
        continue;
      }
    }
    if (inFence) {
      buf.push(line);
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    buf.push(line);
  }
  flush();
  return blocks;
}

export type BlockKind = "table" | "code" | "heading" | "list" | "prose";

/** Classify a block by its first non-empty line (cheap heuristic, good enough
 *  to choose an intra-block diff strategy). */
export function blockKind(block: string): BlockKind {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (/^(```|~~~)/.test(lines[0] ?? "")) return "code";
  if (
    lines.length >= 2 &&
    (lines[0] ?? "").includes("|") &&
    (lines[1] ?? "").includes("-") &&
    /^\|?[\s:|-]+\|?$/.test(lines[1] ?? "")
  )
    return "table";
  if (/^#{1,6}\s/.test(lines[0] ?? "")) return "heading";
  if (/^(\s*[-*+]\s|\s*\d+\.\s)/.test(lines[0] ?? "")) return "list";
  return "prose";
}

// ───────────────────────── generic LCS pairing ─────────────────────────

/** A unit of an aligned diff: unchanged, added-only, removed-only, or a
 *  MODIFIED pair (removed immediately followed by added at the same slot). */
export type PairUnit<T> =
  | { kind: "same"; a: T; b: T }
  | { kind: "add"; b: T }
  | { kind: "del"; a: T }
  | { kind: "mod"; a: T; b: T };

/**
 * LCS-diff two arrays, then zip adjacent removed+added runs into "mod" pairs so
 * the caller can diff inside them. `key` maps an item to its equality string.
 */
export function pairDiff<T>(oldArr: T[], newArr: T[], key: (t: T) => string): PairUnit<T>[] {
  const parts = diffArrays(oldArr.map(key), newArr.map(key));
  const units: PairUnit<T>[] = [];
  let oi = 0;
  let ni = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    const len = p.value.length;
    if (!p.added && !p.removed) {
      for (let k = 0; k < len; k++) units.push({ kind: "same", a: oldArr[oi++]!, b: newArr[ni++]! });
    } else if (p.removed) {
      const nx = parts[i + 1];
      if (nx?.added) {
        const m = Math.min(len, nx.value.length);
        for (let k = 0; k < m; k++) units.push({ kind: "mod", a: oldArr[oi++]!, b: newArr[ni++]! });
        for (let k = m; k < len; k++) units.push({ kind: "del", a: oldArr[oi++]! });
        for (let k = m; k < nx.value.length; k++) units.push({ kind: "add", b: newArr[ni++]! });
        i++; // consumed the following added part
      } else {
        for (let k = 0; k < len; k++) units.push({ kind: "del", a: oldArr[oi++]! });
      }
    } else {
      for (let k = 0; k < len; k++) units.push({ kind: "add", b: newArr[ni++]! });
    }
  }
  return units;
}

// ───────────────────────── table parsing ─────────────────────────

export interface ParsedTable {
  header: string[];
  rows: string[][];
}

/** Parse a GFM table block into header + body cells (the delimiter row at
 *  index 1 is skipped). */
export function parseTable(block: string): ParsedTable {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const splitRow = (l: string): string[] => {
    let s = l.trim();
    if (s.startsWith("|")) s = s.slice(1);
    if (s.endsWith("|")) s = s.slice(0, -1);
    return s.split("|").map((c) => c.trim());
  };
  const header = splitRow(lines[0] ?? "");
  const rows = lines.slice(2).map(splitRow);
  return { header, rows };
}
