// ─────────────────────────────────────────────────────────────────────────
// Link index — host-side cross-file `[[wikilink]]` cache.
//
// Mirrors the shape of taskIndex.ts but for inbound markdown links. Lets
// `<Backlinks>` (and a future GraphView) answer "which other docs link
// here?" without re-walking the library on every render.
//
// Data flow:
//
//   Viewer loads file content → linkIndex.indexFile(id, content, name, path)
//     (idempotent via content-hash check)
//   <Backlinks> reads linkIndex.backlinksFor(currentFileId | currentName)
//
// Wikilink grammar:
//
//   [[Target]]              → links to a doc whose name OR slug equals "Target"
//   [[Target|Display text]] → same, with custom anchor text
//   [[some/path/Target]]    → not yet supported; treated as plain "Target"
//
// Match strategy when answering backlinksFor:
//
//   1. By exact filename (case-insensitive, with or without .md / .mdx ext)
//   2. By slug-of-name (lowercased, dash-separated)
//
// Cross-file refs are best-effort — this is a reader, not a graph DB.
// ─────────────────────────────────────────────────────────────────────────

import { create } from "zustand";

interface OutboundLink {
  /** Raw target as written between [[ and ]] (text portion only). */
  target: string;
  /** Display text (after `|`) or null when same as target. */
  display: string | null;
  /** 1-based line number in the file's content (frontmatter included). */
  line: number;
}

interface CacheCell {
  hash: string;
  links: OutboundLink[];
  fileName: string;
  filePath: string;
  parsedAt: number;
}

interface LinkIndexState {
  index: Record<string, CacheCell>;
  indexFile(
    fileId: string,
    content: string,
    fileName: string,
    filePath: string
  ): void;
  removeFile(fileId: string): void;
  clearAll(): void;
  /**
   * Inbound links for a given target. Pass either the file id (resolved
   * via the index's fileName/filePath) or the raw name/slug. Returns one
   * entry per source-file that links to the target, with the line number
   * of the first match in that file.
   */
  backlinksFor(
    targetFileId: string,
    targetName: string
  ): Array<{
    fromFileId: string;
    fromFileName: string;
    fromFilePath: string;
    line: number;
    display: string | null;
  }>;
}

export const useLinkIndex = create<LinkIndexState>((set, get) => ({
  index: {},

  indexFile(fileId, content, fileName, filePath) {
    const hash = fnv1a(content);
    const prev = get().index[fileId];
    if (prev && prev.hash === hash) return;
    const links = parseWikilinks(content);
    set((s) => ({
      index: {
        ...s.index,
        [fileId]: { hash, links, fileName, filePath, parsedAt: Date.now() },
      },
    }));
  },

  removeFile(fileId) {
    set((s) => {
      if (!(fileId in s.index)) return s;
      const next = { ...s.index };
      delete next[fileId];
      return { index: next };
    });
  },

  clearAll() {
    set({ index: {} });
  },

  backlinksFor(targetFileId, targetName) {
    const { index } = get();
    const targetSlug = slugify(stripExt(targetName));
    const targetExact = stripExt(targetName).toLowerCase();
    const out: Array<{
      fromFileId: string;
      fromFileName: string;
      fromFilePath: string;
      line: number;
      display: string | null;
    }> = [];
    for (const fromFileId in index) {
      if (fromFileId === targetFileId) continue;
      const cell = index[fromFileId];
      for (const link of cell.links) {
        const t = link.target.trim();
        const tNorm = stripExt(t).toLowerCase();
        if (tNorm === targetExact || slugify(t) === targetSlug) {
          out.push({
            fromFileId,
            fromFileName: cell.fileName,
            fromFilePath: cell.filePath,
            line: link.line,
            display: link.display,
          });
          break; // one row per source-file — list view shows one card per source
        }
      }
    }
    return out;
  },
}));

// ─────────────────────────────────────────────────────────────────────────
// Wikilink parser — fast forward scan, ignores fenced code blocks so a
// `\`\`\` doc with [[bracketed]] inside gets skipped.
// ─────────────────────────────────────────────────────────────────────────

function parseWikilinks(content: string): OutboundLink[] {
  const lines = content.split(/\r?\n/);
  const out: OutboundLink[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const re = /\[\[([^\]\n|]+)(?:\|([^\]\n]+))?\]\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const target = m[1].trim();
      const display = m[2]?.trim() || null;
      if (target.length > 0) out.push({ target, display, line: i + 1 });
    }
  }
  return out;
}

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function stripExt(name: string): string {
  return name.replace(/\.(md|mdx|markdown)$/i, "");
}
