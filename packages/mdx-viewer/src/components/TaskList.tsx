// ─────────────────────────────────────────────────────────────────────────
// <TaskList> — grouped / filtered / sorted list view over TasksContext.
//
// Reads the current doc's Task[] from TasksContext (populated by
// MDXViewer's extractTasks pass). Applies optional filter / sort / group
// / limit projections. Renders a grouped list with per-group counts and
// the same TaskChips used by the inline checkbox view.
//
// Example usages:
//
//   <TaskList />
//   <TaskList group-by="status" />
//   <TaskList filter="priority<=p1 AND is:open" />
//   <TaskList group-by="owner" sort="due:asc" />
//   <TaskList filter="is:overdue" limit="10" />
//
// Attributes mapped from react-markdown's prop bag (hyphenated names
// come through as string keys — same pattern as <Chart>, <Kanban>, etc.):
//
//   filter    — predicate source string (see predicate.ts §)
//   group-by  — GroupBy key (status | owner | tag | priority | project |
//               area | goal | due-day | due-week | due-month |
//               due-quarter | due-bucket | created-day | created-week |
//               file | depth)
//   sort      — "key:asc,key:desc" form; see parseSortSpec
//   limit     — integer cap on rows rendered (applied after filter+sort)
//   order     — explicit comma-separated group key order for group-by
//   title     — optional heading above the list
//   empty     — text shown when no tasks match the projection
//
// Pure projection — never parses the document. One-parse-many-consumers.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import {
  useTasks,
  filterTasks,
  sortTasks,
  groupTasks,
  type Task,
  type GroupBy,
} from "@filemark/tasks";
import { TaskChips } from "./TaskItem";

export function TaskList(props: Record<string, unknown>) {
  const tasks = useTasks();
  const filter = asString(props.filter);
  const groupBy = asString(props["group-by"]) as GroupBy | "";
  const sort = asString(props.sort);
  const limitStr = asString(props.limit);
  const order = asString(props.order);
  const title = asString(props.title);
  const empty = asString(props.empty) || "No tasks match.";

  const limit = limitStr ? Number(limitStr) : undefined;

  // Single memoized projection so re-renders stay cheap. The `tasks`
  // identity comes from TasksContext and only changes when the doc
  // re-parses — so this projection runs once per parse+attr change.
  const groups = useMemo(() => {
    let view = tasks;
    if (filter) view = filterTasks(view, filter);
    if (sort) view = sortTasks(view, sort);
    if (limit) view = view.slice(0, limit);
    if (groupBy) {
      const orderKeys = order
        ? order.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
      return groupTasks(view, groupBy as GroupBy, { orderKeys });
    }
    return [{ key: "", tasks: view }];
  }, [tasks, filter, sort, limit, groupBy, order]);

  const totalRendered = groups.reduce((n, g) => n + g.tasks.length, 0);

  return (
    <section className="fv-tasklist my-4">
      {title && (
        <h3 className="fv-tasklist-title text-base font-semibold mb-2">
          {title}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            ({totalRendered})
          </span>
        </h3>
      )}
      {totalRendered === 0 && (
        <div className="text-muted-foreground border rounded-md p-3 text-sm italic">
          {empty}
        </div>
      )}
      {groups.map((g) => (
        <TaskGroup key={g.key || "__flat__"} label={g.key} tasks={g.tasks} />
      ))}
    </section>
  );
}

function TaskGroup({ label, tasks }: { label: string; tasks: Task[] }) {
  if (tasks.length === 0) return null;
  return (
    <div className="fv-tasklist-group mb-3">
      {label && (
        <div className="fv-tasklist-group-header text-muted-foreground border-b pb-1 mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
          <span>{label || "(unset)"}</span>
          <span className="tabular-nums opacity-70">{tasks.length}</span>
        </div>
      )}
      <ul className="fv-tasklist-items space-y-1">
        {tasks.map((t) => (
          <TaskListRow key={t.id} task={t} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Row renderer — intentionally lighter than the enhanced TaskCheckbox.
 * Shows status glyph + text + chips. Not interactive (no tick-toggle);
 * the canonical interactive row is the inline <li> rendered by
 * TaskItem. Use this for dashboard/list views where you want a compact
 * read-only row.
 */
function TaskListRow({ task }: { task: Task }) {
  const glyph = statusGlyph(task.status);
  const struck = task.status === "done" || task.status === "cancelled";
  return (
    <li className="fv-tasklist-row flex items-start gap-2 text-sm">
      <span
        className="fv-tasklist-status text-muted-foreground select-none w-5 shrink-0 tabular-nums"
        title={task.status}
      >
        {glyph}
      </span>
      <span
        className={`flex-1 min-w-0 ${struck ? "line-through opacity-60" : ""}`}
      >
        {task.text || <span className="italic opacity-60">(empty)</span>}
        {task.file && task.line && (
          <span className="text-muted-foreground ml-2 text-[10px] tabular-nums">
            {fileBadge(task.file)}:{task.line}
          </span>
        )}
      </span>
      <TaskChips task={task} />
    </li>
  );
}

function statusGlyph(s: string): string {
  switch (s) {
    case "todo":
      return "☐";
    case "wip":
      return "◐";
    case "done":
      return "☑";
    case "blocked":
      return "⚠";
    case "question":
      return "?";
    case "cancelled":
      return "⊘";
    default:
      return "·";
  }
}

/** Short file name for badging — just the basename. */
function fileBadge(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(idx + 1) : path;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
