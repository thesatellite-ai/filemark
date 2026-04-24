// ─────────────────────────────────────────────────────────────────────────
// group + sort — projections over Task[].
//
// These are pure functions (no React, no I/O). Used by:
//
//   - <TaskList group-by="status" sort="due:asc">
//   - <Kanban md group-by="status" order="todo,wip,done">
//   - <TaskStats md /> (internally groups by status)
//
// Spec: docsi/TASKS_PLAN.md §9.2 + §9.3.
//
// Group key sources:
//
//   status / priority / project / area / goal / file / depth
//     — single scalar from the Task, used directly as the group key.
//
//   owner / tag
//     — array fields. A task with multiple owners/tags shows up in each
//       group it belongs to (standard many-to-many rendering).
//
//   due-day / due-week / due-month / due-quarter
//     — derived from task.due.iso. Group key is the bucket string
//       (e.g. "2026-04-28" / "2026-W17" / "2026-04" / "2026-Q2").
//
//   due-bucket
//     — smart time bucket: Overdue / Today / Tomorrow / This week /
//       Next week / Later / No due. The most useful group-by for a
//       "what's on my plate" view.
//
// Sort order:
//
//   status  — canonical order (todo → wip → blocked → question → done → cancelled)
//   priority — p0 < p1 < p2 < p3
//   due / start — ISO strings sort lexicographically (correct for ISO 8601)
//   default — locale-compare on strings, numeric for numbers, absent last
// ─────────────────────────────────────────────────────────────────────────

import type { Task, TaskStatus, Priority, GroupBy, SortSpec } from "./types";

// Canonical orderings -------------------------------------------------------

const STATUS_ORDER: TaskStatus[] = [
  "todo",
  "wip",
  "blocked",
  "question",
  "done",
  "cancelled",
];
const STATUS_IDX: Record<TaskStatus, number> = Object.fromEntries(
  STATUS_ORDER.map((s, i) => [s, i])
) as never;

const PRIORITY_IDX: Record<Priority, number> = { p0: 0, p1: 1, p2: 2, p3: 3 };

// Group key derivation ------------------------------------------------------

/** Return the groupKey(s) a task belongs to. Most fields return one key;
 *  owner/tag return multiple (task appears in every matching group). */
function groupKeysFor(t: Task, by: GroupBy, now: Date): string[] {
  switch (by) {
    case "status":
      return [t.status];
    case "priority":
      return [t.priority ?? "_"];
    case "owner":
      return t.owners.length ? t.owners : ["_"];
    case "tag":
      return t.tags.length ? t.tags : ["_"];
    case "project":
      return [t.project ?? "_"];
    case "area":
      return [t.area ?? "_"];
    case "goal":
      return [t.goal ?? "_"];
    case "file":
      return [t.file ?? "_"];
    case "depth":
      return [String(t.depth)];

    case "due-day":
      return [t.due?.iso ?? "_"];
    case "due-week":
      return [t.due?.iso ? isoWeek(t.due.iso) : "_"];
    case "due-month":
      return [t.due?.iso ? t.due.iso.slice(0, 7) : "_"];
    case "due-quarter":
      return [t.due?.iso ? isoQuarter(t.due.iso) : "_"];
    case "due-bucket":
      return [dueBucket(t, now)];

    case "created-day":
      return [t.created ?? "_"];
    case "created-week":
      return [t.created ? isoWeek(t.created) : "_"];
  }
}

/**
 * Bucket a task's due date into a human-readable label. The order of
 * buckets in the UI is what callers will typically sort by.
 */
function dueBucket(t: Task, now: Date): string {
  if (!t.due?.iso) return "No due";
  const today = toISODate(now);
  if (t.due.iso < today && t.status !== "done" && t.status !== "cancelled") {
    return "Overdue";
  }
  if (t.due.iso === today) return "Today";
  const t2 = new Date(now);
  t2.setDate(t2.getDate() + 1);
  if (t.due.iso === toISODate(t2)) return "Tomorrow";
  const t7 = new Date(now);
  t7.setDate(t7.getDate() + 7);
  if (t.due.iso <= toISODate(t7)) return "This week";
  const t14 = new Date(now);
  t14.setDate(t14.getDate() + 14);
  if (t.due.iso <= toISODate(t14)) return "Next week";
  return "Later";
}

const BUCKET_ORDER = [
  "Overdue",
  "Today",
  "Tomorrow",
  "This week",
  "Next week",
  "Later",
  "No due",
];

// groupTasks ----------------------------------------------------------------

/**
 * Group a task array by a key. Returns `[{ key, tasks }]` in natural
 * order for the group type (e.g. status order for `status`, p0→p3 for
 * `priority`, bucket order for `due-bucket`, ascending ISO for date
 * buckets, alpha for strings).
 *
 * If the same task falls into multiple groups (owner/tag), it appears in
 * each — consistent with how Linear/Jira render "group by assignee" with
 * multiple assignees.
 */
export function groupTasks(
  tasks: Task[],
  by: GroupBy,
  opts?: { now?: Date; orderKeys?: string[] }
): Array<{ key: string; tasks: Task[] }> {
  const ref = opts?.now ?? new Date();
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    for (const k of groupKeysFor(t, by, ref)) {
      const bucket = map.get(k);
      if (bucket) bucket.push(t);
      else map.set(k, [t]);
    }
  }

  // Natural-order the keys per group type.
  const keys = [...map.keys()];
  if (opts?.orderKeys) {
    // Caller-provided explicit order (e.g. `order="todo,wip,done"`).
    const idx = new Map(opts.orderKeys.map((k, i) => [k, i]));
    keys.sort((a, b) => (idx.get(a) ?? 999) - (idx.get(b) ?? 999));
  } else if (by === "status") {
    keys.sort((a, b) => (STATUS_IDX[a as TaskStatus] ?? 999) - (STATUS_IDX[b as TaskStatus] ?? 999));
  } else if (by === "priority") {
    keys.sort((a, b) => (PRIORITY_IDX[a as Priority] ?? 999) - (PRIORITY_IDX[b as Priority] ?? 999));
  } else if (by === "due-bucket") {
    keys.sort((a, b) => BUCKET_ORDER.indexOf(a) - BUCKET_ORDER.indexOf(b));
  } else {
    keys.sort((a, b) => a.localeCompare(b));
  }

  return keys.map((key) => ({ key, tasks: map.get(key)! }));
}

// sortTasks -----------------------------------------------------------------

/**
 * Sort a task array by a multi-key spec. Accepts either:
 *   - String form: "due:asc,priority:asc"
 *   - Parsed form: [{ key: "due", dir: "asc" }, …]
 *
 * Unknown keys are silently ignored (no-op). Missing values sort last.
 */
export function sortTasks(
  tasks: Task[],
  spec: string | SortSpec[]
): Task[] {
  const parsed = typeof spec === "string" ? parseSortSpec(spec) : spec;
  const copy = tasks.slice();
  copy.sort((a, b) => compareTasks(a, b, parsed));
  return copy;
}

/**
 * Parse "due:asc,priority:desc" into SortSpec[]. Missing direction
 * defaults to asc.
 */
export function parseSortSpec(s: string): SortSpec[] {
  return s
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [key, dir] = part.split(":");
      return {
        key: key.trim(),
        dir: (dir?.trim() as "asc" | "desc") === "desc" ? "desc" : "asc",
      };
    });
}

function compareTasks(a: Task, b: Task, spec: SortSpec[]): number {
  for (const { key, dir } of spec) {
    const cmp = cmpByKey(a, b, key);
    if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
  }
  return 0;
}

function cmpByKey(a: Task, b: Task, key: string): number {
  switch (key) {
    case "status":
      return (STATUS_IDX[a.status] ?? 999) - (STATUS_IDX[b.status] ?? 999);
    case "priority": {
      const la = a.priority ? PRIORITY_IDX[a.priority] : 999;
      const lb = b.priority ? PRIORITY_IDX[b.priority] : 999;
      return la - lb;
    }
    case "due":
      return dateCompare(a.due?.iso, b.due?.iso);
    case "start":
      return dateCompare(a.start?.iso, b.start?.iso);
    case "created":
      return dateCompare(a.created, b.created);
    case "completed":
      return dateCompare(a.completed, b.completed);
    case "estimate":
      return (a.estimate?.seconds ?? Infinity) - (b.estimate?.seconds ?? Infinity);
    case "percent":
      return (a.percent ?? -1) - (b.percent ?? -1);
    case "text":
      return a.text.localeCompare(b.text);
    case "owner":
      return (a.owners[0] ?? "").localeCompare(b.owners[0] ?? "");
    case "project":
      return (a.project ?? "").localeCompare(b.project ?? "");
    case "file":
      return (a.file ?? "").localeCompare(b.file ?? "");
    case "line":
      return (a.line ?? 0) - (b.line ?? 0);
    default:
      return 0;
  }
}

function dateCompare(a: string | undefined, b: string | undefined): number {
  // Missing dates sort last.
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

// ISO helpers ---------------------------------------------------------------

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

/** YYYY-MM-DD → YYYY-Www (ISO 8601 week). */
function isoWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const tmp = new Date(d.getTime());
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function isoQuarter(iso: string): string {
  const year = iso.slice(0, 4);
  const month = Number(iso.slice(5, 7));
  const q = Math.ceil(month / 3);
  return `${year}-Q${q}`;
}
