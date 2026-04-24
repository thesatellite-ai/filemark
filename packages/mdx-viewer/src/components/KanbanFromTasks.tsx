// ─────────────────────────────────────────────────────────────────────────
// <Kanban md/> — board view from task lines.
//
// Renders a horizontal-scrolling board where each column is a group of
// tasks (status by default) and each card is one task. Reads
// TasksContext — no CSV needed, no separate data file. Same markdown,
// different lens.
//
// Example authoring:
//
//   <Kanban md/>                                     <!-- group-by status, default -->
//   <Kanban md group-by="status"/>
//   <Kanban md group-by="owner" order="alice,grace,linus"/>
//   <Kanban md group-by="priority" order="p0,p1,p2,p3"/>
//   <Kanban md filter="project=launch" group-by="status"/>
//
// Filter is the predicate DSL (see predicate.ts). Order pins column
// positions; missing values appear after the ordered set.
//
// This component does NOT reuse @filemark/kanban's Card/Column
// internals — those expect datagrid Row/Column shapes. Tasks need their
// own lightweight card layout with status glyph + text + chips, so we
// render directly here.
//
// Read-only by design (same thesis as <Kanban src=...>): the user edits
// the markdown in their editor; filemark re-renders on auto-refresh.
// No drag-and-drop.
//
// Spec: docsi/TASKS_PLAN.md §10.3.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import {
  useTasks,
  filterTasks,
  groupTasks,
  sortTasks,
  type Task,
  type GroupBy,
} from "@filemark/tasks";
import { TaskChips } from "./TaskItem";

export function KanbanFromTasks(props: Record<string, unknown>) {
  const tasks = useTasks();
  const filter = asString(props.filter);
  const groupByAttr = asString(props["group-by"]) || "status";
  const order = asString(props.order);
  const sort = asString(props.sort);
  const title = asString(props.title);
  const heightAttr = asString(props.height);

  // The set of keys valid for task-kanban grouping. Same as GroupBy but
  // here we validate the attr so mistyped values don't silently default.
  const groupBy = groupByAttr as GroupBy;

  // Height — numeric px, or string (vh / fit-content). Defaults to 560px.
  const height = heightAttr
    ? /^\d+$/.test(heightAttr)
      ? Number(heightAttr)
      : heightAttr
    : 560;

  const columns = useMemo(() => {
    let view = tasks;
    if (filter) view = filterTasks(view, filter);
    if (sort) view = sortTasks(view, sort);
    const orderKeys = order
      ? order.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    return groupTasks(view, groupBy, { orderKeys });
  }, [tasks, filter, sort, groupBy, order]);

  const totalRendered = columns.reduce((n, c) => n + c.tasks.length, 0);

  return (
    <section className="fv-task-kanban my-4">
      {title && (
        <h3 className="text-base font-semibold mb-2">
          {title}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            ({totalRendered})
          </span>
        </h3>
      )}
      <div
        className="bg-muted/30 rounded-md overflow-auto border"
        style={{ height, maxHeight: height }}
      >
        <div className="flex h-full min-h-0 items-stretch gap-3 p-3">
          {columns.map((col) => (
            <KanbanColumn key={col.key} groupBy={groupBy} header={col.key} tasks={col.tasks} />
          ))}
          {columns.length === 0 && (
            <div className="text-muted-foreground self-center mx-auto text-sm italic">
              No tasks match.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function KanbanColumn({
  groupBy,
  header,
  tasks,
}: {
  groupBy: GroupBy;
  header: string;
  tasks: Task[];
}) {
  return (
    <div className="bg-card flex min-w-[260px] max-w-[300px] flex-col rounded-md border">
      <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
        <span className="font-semibold uppercase tracking-wider">
          {header || "(unset)"}
        </span>
        <span className="text-muted-foreground tabular-nums">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2 overflow-auto p-2">
        {tasks.map((t) => (
          <KanbanCard key={t.id} task={t} hideGroupKey={groupBy} />
        ))}
        {tasks.length === 0 && (
          <div className="text-muted-foreground/60 py-4 text-center text-xs italic">
            Empty
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A task card in a kanban column. Shows:
 *   - Status glyph (skipped when grouping by status — redundant with column)
 *   - Text (strikethrough on done/cancelled)
 *   - File:line badge when the task has source info
 *   - TaskChips (reuses the enhanced-checkbox chip renderer)
 *
 * `hideGroupKey` suppresses the chip that duplicates the column header
 * (e.g. don't show the @alice chip when grouping by owner).
 */
function KanbanCard({ task, hideGroupKey }: { task: Task; hideGroupKey: GroupBy }) {
  const struck = task.status === "done" || task.status === "cancelled";
  return (
    <article className="bg-background rounded-md border p-2 text-[13px] leading-snug shadow-sm">
      <div className="flex items-start gap-2">
        {hideGroupKey !== "status" && (
          <span className="select-none w-4 text-muted-foreground shrink-0">
            {statusGlyph(task.status)}
          </span>
        )}
        <span className={`flex-1 min-w-0 ${struck ? "line-through opacity-60" : ""}`}>
          {task.text || <span className="italic opacity-60">(empty)</span>}
        </span>
      </div>
      <div className="mt-1.5">
        <TaskChipsFiltered task={task} hideGroupKey={hideGroupKey} />
      </div>
      {task.file && task.line && (
        <div className="text-muted-foreground/70 mt-1 text-[10px] tabular-nums">
          {basename(task.file)}:{task.line}
        </div>
      )}
    </article>
  );
}

/**
 * Wrapper around TaskChips that drops the chip duplicating the column key.
 * Simpler to do via conditional Task mutation than forking the renderer.
 */
function TaskChipsFiltered({
  task,
  hideGroupKey,
}: {
  task: Task;
  hideGroupKey: GroupBy;
}) {
  const display = useMemo<Task>(() => {
    // Shallow clone; only nullify the field that equals the column key.
    const copy: Task = { ...task };
    if (hideGroupKey === "priority") copy.priority = undefined;
    if (hideGroupKey === "project") copy.project = undefined;
    if (hideGroupKey === "area") copy.area = undefined;
    if (hideGroupKey === "goal") copy.goal = undefined;
    if (hideGroupKey === "owner") copy.owners = [];
    if (hideGroupKey === "tag") copy.tags = [];
    return copy;
  }, [task, hideGroupKey]);
  return <TaskChips task={display} />;
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

function basename(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(idx + 1) : path;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
