// ─────────────────────────────────────────────────────────────────────────
// Task index — host-side cross-file task cache.
//
// Central store for the TaskPanel side-panel (Phase 4). Keeps a parsed
// Task[] per opened file, keyed by file id. Value is a cache cell holding:
//
//   - contentHash: cheap FNV-1a over the content string
//   - tasks:       parsed Task[] from @filemark/tasks' extractTasks
//   - fileName:    display-friendly name for file badges in the panel
//   - filePath:    source path — passed into extractTasks so each task
//                  carries file origin in its own `.file` field
//
// Data flow:
//
//   Viewer loads file content → taskIndex.indexFile(id, content, name, path)
//     (idempotent via content-hash check; re-parses only on change)
//   TaskPanel reads taskIndex.allTasks() and applies its own filter/group
//
// Rationale for a Zustand store vs a React context:
//
//   - The index is written from Viewer but consumed from TaskPanel. They
//     live in different branches of the tree, so a context high enough to
//     cover both would need to live in Shell — fine in theory but
//     complicates prop plumbing.
//
//   - Zustand's selective subscription is a perf win when hundreds of
//     files are cached. Only re-renders components whose selector output
//     changed.
//
//   - Matches the existing pattern for `useLibrary` and `useSettings`;
//     consistent with the rest of the app.
//
// Capacity: designed for ~1000 opened files. The store holds them all;
// eviction would come into play only at 10K+ files, out of scope for v1.
// ─────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { extractTasks, type Task } from "@filemark/tasks";

interface CacheCell {
  /** FNV-1a hash of the file content string. */
  hash: string;
  tasks: Task[];
  fileName: string;
  filePath: string;
  /** Epoch milliseconds — lets the panel show "re-parsed X minutes ago". */
  parsedAt: number;
}

interface TaskIndexState {
  /** fileId → cache cell. Insertion order preserved for deterministic iteration. */
  index: Record<string, CacheCell>;

  /**
   * Index (or re-index on content change) a file's tasks. The hash check
   * makes repeated calls with unchanged content cheap — a no-op when the
   * content hasn't actually changed.
   */
  indexFile(
    fileId: string,
    content: string,
    fileName: string,
    filePath: string
  ): void;

  /** Remove a file from the index — called when the file is removed from the library. */
  removeFile(fileId: string): void;

  /** Wipe the entire cache — used during clearAll or library reset. */
  clearAll(): void;

  /** Flat, union-across-all-files Task[]. Re-computed from the store on each call — cheap. */
  allTasks(): Task[];

  /** Tasks in a specific file, or empty array when not indexed. */
  tasksFor(fileId: string): Task[];
}

export const useTaskIndex = create<TaskIndexState>((set, get) => ({
  index: {},

  indexFile(fileId, content, fileName, filePath) {
    const hash = fnv1a(content);
    const prev = get().index[fileId];
    // No-op when content hasn't changed — protects against useEffect
    // double-fires and auto-refresh ticks with identical bytes.
    if (prev && prev.hash === hash) return;

    // Strip frontmatter BEFORE calling extractTasks so task.line values
    // are body-relative — matching what @filemark/mdx's MDXViewer
    // produces (it also parses the frontmatter-stripped body) and
    // matching what react-markdown's `node.position.start.line` reports
    // on each <li>'s data-fv-task-line attribute. Without this, panel
    // click → openTaskLocation → scrollTarget.line would be
    // full-content-relative, so querySelector would miss the target
    // (or highlight the wrong row coincidentally at the same offset).
    const body = stripFrontmatter(content);

    let tasks: Task[] = [];
    try {
      tasks = extractTasks(body, { file: filePath });
    } catch {
      // Parser shouldn't throw, but belt-and-suspenders — keep the cell
      // with an empty task list rather than crashing the panel.
      tasks = [];
    }

    set((s) => ({
      index: {
        ...s.index,
        [fileId]: { hash, tasks, fileName, filePath, parsedAt: Date.now() },
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

  allTasks() {
    const { index } = get();
    const out: Task[] = [];
    for (const fileId in index) {
      for (const t of index[fileId].tasks) out.push(t);
    }
    return out;
  },

  tasksFor(fileId) {
    return get().index[fileId]?.tasks ?? [];
  },
}));

/**
 * Flatten a {fileId→cell} record into a Task[] via zustand selector.
 * Exported so TaskPanel can subscribe reactively — the hook returns a
 * new array when any file's tasks change, which triggers re-render.
 */
export function selectAllTasks(s: TaskIndexState): Task[] {
  const out: Task[] = [];
  for (const fileId in s.index) {
    for (const t of s.index[fileId].tasks) out.push(t);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// FNV-1a 32-bit hash — same function family used in @filemark/tasks' auto
// id derivation. Kept local here to avoid importing an internal helper.
// Short hex digest is plenty of discrimination at library scale.
// ─────────────────────────────────────────────────────────────────────────

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Strip a leading YAML-ish `---` frontmatter block from markdown content.
 * Mirrors the extractor in @filemark/mdx's MDXViewer so the line numbers
 * produced by extractTasks here match what react-markdown sees when it
 * renders the body. If no frontmatter is present the original content
 * is returned unchanged.
 */
function stripFrontmatter(content: string): string {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return content;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      return lines.slice(i + 1).join("\n");
    }
  }
  // Unterminated frontmatter — bail safely.
  return content;
}
