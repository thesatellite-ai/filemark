// ─────────────────────────────────────────────────────────────────────────
// extractTasks — walk a markdown document, parse every task-bullet line.
//
// This is the doc-level entry point. parseLine.ts handles a single line;
// this file:
//
//   1. Reads the raw markdown text line-by-line (fast, regex-only; no
//      mdast dependency — keeps the package pure and usable outside any
//      specific markdown pipeline).
//
//   2. For every line that matches a GFM task bullet, calls parseTaskLine
//      with the line number and file name for id derivation.
//
//   3. Collects non-task child bullets under each task as `notes[]` — the
//      renderer shows them as a collapsible "ℹ 3 notes" pill.
//
//   4. Reconstructs the nested tree: `subTasks[]` is populated on parent
//      tasks by looking at indentation depth.
//
//   5. Parses YAML-ish frontmatter at the top of the doc (duplicate of
//      the extractor in mdx-viewer — intentionally local so this package
//      has no runtime dependency on mdx-viewer). Extracts `default-owner`,
//      `default-priority`, `project`, etc. into a TaskDefaults object
//      passed to every parse call.
//
//   6. Extracts ` ```tasks ` fences separately — info-string flags on
//      the fence become per-fence defaults (and can override frontmatter).
//
// Performance notes:
//
//   - We do a single pass over the source. ~1000 lines parses in <10ms on
//     any modern machine (confirmed empirically with filemark's test
//     docs).
//
//   - We memoize nothing here — the host (MDXViewer) wraps calls in a
//     useMemo keyed by file-content hash. See docsi/TASKS_PLAN.md §8 for
//     the parse-once-share-via-context architecture.
//
//   - Not using regex-for-tasks-across-the-whole-doc is deliberate; we
//     want to capture nesting + notes + frontmatter in one pass.
// ─────────────────────────────────────────────────────────────────────────

import type { Task, TaskDefaults } from "./types";
import { parseTaskLine } from "./parseLine";

const TASK_LINE_RE = /^(\s*)[-*+]\s+\[([ xX/!?\-])\]\s+.+$/;
const LIST_BULLET_RE = /^(\s*)[-*+]\s+(.+)$/;
const FENCE_OPEN_RE = /^```tasks\b(.*)$/;
const FENCE_CLOSE_RE = /^```\s*$/;

/**
 * Parse every task-bullet in a markdown document. Returns a FLAT list in
 * source order — nested children also appear in the flat list but with
 * `parentId` + `depth` set; `subTasks[]` is populated on parents for
 * convenient tree access.
 *
 * @param markdown  Full document text (including any frontmatter).
 * @param opts      file path (for id derivation) + defaults cascade.
 */
export function extractTasks(
  markdown: string,
  opts?: {
    file?: string;
    /** Defaults applied when the task line + fence + frontmatter don't set a field. */
    defaults?: TaskDefaults;
    /** Time reference for keyword date resolution. Defaults to Date.now(). */
    now?: Date;
  }
): Task[] {
  const lines = markdown.split(/\r?\n/);

  // ── STEP 1: extract frontmatter if present ──────────────────────────
  //
  // A YAML-ish frontmatter block is delimited by `---` on its own line at
  // the very top and another `---` closing. We parse only the fields
  // we care about (default-owner, default-priority, project, area) with
  // a tiny line-based reader — no YAML library dependency.
  let bodyStart = 0;
  const frontmatterDefaults: TaskDefaults = {};
  if (lines[0]?.trim() === "---") {
    let i = 1;
    while (i < lines.length && lines[i].trim() !== "---") {
      const m = /^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.+)$/.exec(lines[i]);
      if (m) {
        const key = m[1].toLowerCase();
        const value = m[2].trim().replace(/^["']|["']$/g, "");
        if (key === "default-owner") frontmatterDefaults.owners = [value];
        else if (key === "default-priority") {
          frontmatterDefaults.priority = value as TaskDefaults["priority"];
        } else if (key === "project") frontmatterDefaults.project = value;
        else if (key === "area") frontmatterDefaults.area = value;
      }
      i++;
    }
    bodyStart = i < lines.length ? i + 1 : i;
  }

  // Merged defaults: host-supplied < frontmatter. Task-line > everything.
  const baseDefaults: TaskDefaults = { ...opts?.defaults, ...frontmatterDefaults };

  // ── STEP 2: line-by-line scan ───────────────────────────────────────
  //
  // State machine:
  //   - `inFence`     — inside a ```tasks ... ``` fence; fenceDefaults
  //                     are merged on top of baseDefaults.
  //   - `lastTask`    — most recently parsed task (for note accumulation
  //                     and parent link).
  //   - `taskStack`   — stack of open parents keyed by depth; used to set
  //                     parentId when deeper tasks appear.
  const flat: Task[] = [];
  let inFence = false;
  let fenceDefaults: TaskDefaults = {};
  let lastTask: Task | null = null;
  const parentStack: Task[] = [];

  for (let idx = bodyStart; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineNo = idx + 1; // 1-based line numbering for diagnostics

    // ── Fence handling ────────────────────────────────────────────────
    if (!inFence) {
      const open = FENCE_OPEN_RE.exec(line);
      if (open) {
        inFence = true;
        fenceDefaults = parseFenceInfoString(open[1] ?? "");
        continue;
      }
    } else {
      if (FENCE_CLOSE_RE.test(line)) {
        inFence = false;
        fenceDefaults = {};
        continue;
      }
    }

    // Merged defaults at this line position.
    const defaults: TaskDefaults = { ...baseDefaults, ...fenceDefaults };

    // ── Task detection ────────────────────────────────────────────────
    if (TASK_LINE_RE.test(line)) {
      const task = parseTaskLine(line, {
        file: opts?.file,
        lineNo,
        defaults,
        now: opts?.now,
      });
      if (!task) continue; // Shouldn't happen given our test matched.

      // Fix up parent link based on depth stack.
      while (parentStack.length > 0 && parentStack[parentStack.length - 1].depth >= task.depth) {
        parentStack.pop();
      }
      if (parentStack.length > 0) {
        task.parentId = parentStack[parentStack.length - 1].id;
      }
      parentStack.push(task);

      flat.push(task);
      lastTask = task;
      continue;
    }

    // ── Non-task child bullet → attach as note on lastTask ───────────
    //
    // If the line is an indented list item (not a task) AND we have a
    // most-recently-seen task, and the bullet's indent is deeper than
    // that task's, treat it as a note on the parent task.
    if (lastTask) {
      const bulletMatch = LIST_BULLET_RE.exec(line);
      if (bulletMatch) {
        const [, indent, text] = bulletMatch;
        const noteDepth = Math.floor(
          indent.replace(/\t/g, "  ").length / 2
        );
        if (noteDepth > lastTask.depth) {
          if (!lastTask.notes) lastTask.notes = [];
          lastTask.notes.push(text.trim());
          continue;
        }
      }
      // Blank line or non-list content — break the "note attachment" run.
      if (line.trim() === "" || !LIST_BULLET_RE.test(line)) {
        // Don't break on blank lines (task groups are often separated by
        // blanks); only non-bullet, non-blank content resets.
        if (line.trim() !== "") {
          lastTask = null;
          parentStack.length = 0;
        }
      }
    }
  }

  // ── STEP 3: rebuild subTasks tree ────────────────────────────────────
  //
  // Walk flat list; for each task with parentId, find the parent and
  // push into its subTasks. Cheap O(n) with a small id→task map.
  const byId = new Map<string, Task>();
  for (const t of flat) byId.set(t.id, t);
  for (const t of flat) {
    if (t.parentId) {
      const parent = byId.get(t.parentId);
      if (parent) {
        if (!parent.subTasks) parent.subTasks = [];
        parent.subTasks.push(t);
      }
    }
  }

  return flat;
}

/**
 * Parse the info-string that follows ```tasks on the fence opener.
 *
 * Example:
 *
 *   ```tasks id=backlog default-owner=alice default-priority=p1 group-by=status
 *
 * Info-string flags supported in v1.0: `default-owner`, `default-priority`,
 * `default-project`, `default-area`. Other flags (`id`, `group-by`,
 * `view`, `filter`, `sort`) don't affect parsing — they're for the fence
 * renderer which reads the meta separately.
 *
 * Kept intentionally minimal; full grammar in docsi/TASKS_PLAN.md §3.3.
 */
function parseFenceInfoString(info: string): TaskDefaults {
  const out: TaskDefaults = {};
  // Split on whitespace, respecting quoted values: `title="Sprint 2"`.
  const tokens = info.trim().match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  for (const tok of tokens) {
    const m = /^([a-zA-Z-]+)=(.+)$/.exec(tok);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].replace(/^["']|["']$/g, "");
    if (key === "default-owner") out.owners = [value];
    else if (key === "default-priority") {
      out.priority = value as TaskDefaults["priority"];
    } else if (key === "default-project") out.project = value;
    else if (key === "default-area") out.area = value;
  }
  return out;
}
