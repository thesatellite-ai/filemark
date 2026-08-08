// Lightweight Markdown structure parser shared by the language features
// (outline, folding, status bar). Text-only — no rendering, no DOM — so it runs
// cheaply in the extension host on every document. Fenced code + frontmatter are
// tracked so `#` inside a code block is never mistaken for a heading.

import type * as vscode from "vscode";

export interface Heading {
  level: number; // 1..6
  text: string;
  line: number; // 0-indexed
}

export interface DocModel {
  headings: Heading[];
  /** [startLine, endLine] (0-indexed, inclusive) of each fenced code block. */
  fences: Array<[number, number]>;
  /** Last line (0-indexed) of the frontmatter block, or -1 if none. */
  frontmatterEnd: number;
  lineCount: number;
}

const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE_RE = /^\s*(`{3,}|~{3,})/;

/** Parse a document's headings, fenced-code ranges, and frontmatter span. */
export function parseMarkdown(doc: vscode.TextDocument): DocModel {
  const headings: Heading[] = [];
  const fences: Array<[number, number]> = [];
  const lineCount = doc.lineCount;

  // Frontmatter: `---` on line 0, closed by the next `---`.
  let frontmatterEnd = -1;
  let start = 0;
  if (lineCount > 0 && doc.lineAt(0).text.trim() === "---") {
    for (let i = 1; i < lineCount; i++) {
      if (doc.lineAt(i).text.trim() === "---") {
        frontmatterEnd = i;
        start = i + 1;
        break;
      }
    }
  }

  let fenceStart = -1;
  let fenceMarker = "";
  for (let i = start; i < lineCount; i++) {
    const text = doc.lineAt(i).text;
    const fence = FENCE_RE.exec(text);
    if (fenceStart === -1 && fence) {
      fenceStart = i;
      fenceMarker = fence[1][0]; // ` or ~
      continue;
    }
    if (fenceStart !== -1) {
      // Closing fence: same marker char, at least as long, nothing but the fence.
      if (fence && fence[1][0] === fenceMarker) {
        fences.push([fenceStart, i]);
        fenceStart = -1;
      }
      continue; // inside a fence — never a heading
    }
    const h = HEADING_RE.exec(text);
    if (h) headings.push({ level: h[1].length, text: h[2] || "(untitled)", line: i });
  }
  // Unterminated fence runs to EOF.
  if (fenceStart !== -1) fences.push([fenceStart, lineCount - 1]);

  return { headings, fences, frontmatterEnd, lineCount };
}

/** Rough word count of the body (frontmatter + fenced code excluded). */
export function wordCount(doc: vscode.TextDocument, model: DocModel): number {
  const inFence = (line: number) =>
    model.fences.some(([s, e]) => line >= s && line <= e);
  const bodyStart = model.frontmatterEnd + 1;
  let words = 0;
  for (let i = bodyStart; i < model.lineCount; i++) {
    if (inFence(i)) continue;
    const m = doc.lineAt(i).text.trim().match(/\S+/g);
    if (m) words += m.length;
  }
  return words;
}

/** Average adult reading speed; ~200 wpm is the common estimate. */
const WORDS_PER_MINUTE = 200;

/** Estimated reading time in whole minutes (floored at 1) for a word count. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Task bullet: `- [ ]`, `- [x]`, `- [/]`, `- [-]`, `- [?]`, `- [!]`. */
const TASK_RE = /^\s*[-*+]\s+\[([ xX/\-?!])\]/;
const DONE_MARKS = new Set(["x", "X"]);

/** Count total + done task bullets (skips fenced code). */
export function taskCounts(
  doc: vscode.TextDocument,
  model: DocModel,
): { total: number; done: number } {
  const inFence = (line: number) =>
    model.fences.some(([s, e]) => line >= s && line <= e);
  let total = 0;
  let done = 0;
  for (let i = 0; i < model.lineCount; i++) {
    if (inFence(i)) continue;
    const m = TASK_RE.exec(doc.lineAt(i).text);
    if (m) {
      total++;
      if (DONE_MARKS.has(m[1])) done++;
    }
  }
  return { total, done };
}
