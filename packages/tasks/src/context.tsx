// ─────────────────────────────────────────────────────────────────────────
// TasksContext — "one parse, many consumers" React provider.
//
// Full architecture in docsi/TASKS_PLAN.md §8. Short version:
//
//   MDXViewer (host)
//     └─ useMemo(extractTasks(body))           ← one parse per file render
//        └─ <TasksProvider value={tasks}>
//              ├─ enhanced <TaskCheckbox>      ← reads context, self-looks-up by line
//              ├─ <TaskList/>                  ← reads context, projects filter/group
//              ├─ <TaskStats md/>              ← reads context, counts
//              └─ <Kanban md/>                 ← reads context, feeds Board
//
// Zero duplicate parsing. Cross-view reactivity for free (when content
// changes → new parse → context value changes → every consumer re-renders
// together, coherently).
//
// The `useTasks()` hook returns an empty array when rendered outside a
// provider — that's intentional so a component rendered in a context
// without tasks (e.g. a showcase doc in the playground without
// markdown source) doesn't throw; it just sees zero tasks.
// ─────────────────────────────────────────────────────────────────────────

import { createContext, useContext, type ReactNode } from "react";
import type { Task } from "./types";

// Context value: the flat array of parsed tasks for the current doc.
// Multi-file aggregation uses a separate OpenedDocsContext (see §8.7 of
// the plan) — this one is doc-scoped.
const TasksContext = createContext<Task[] | null>(null);

/**
 * Provider component — host (MDXViewer) wraps children with this after
 * parsing the document.
 *
 * Example:
 *
 *   const tasks = useMemo(() => extractTasks(body, { file }), [body, file]);
 *   return <TasksProvider value={tasks}>...children...</TasksProvider>;
 */
export function TasksProvider({
  value,
  children,
}: {
  value: Task[];
  children: ReactNode;
}) {
  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
}

/**
 * Consumer hook — returns the task array for the current doc. Returns
 * an empty array (never throws) when used outside a provider so
 * components stay rendering-safe across hosts.
 *
 * Most consumers will then apply their own filter/sort/group locally:
 *
 *   const tasks = useTasks();
 *   const view = useMemo(() => {
 *     let t = tasks;
 *     if (filter) t = filterTasks(t, filter);
 *     if (groupBy) return groupTasks(t, groupBy);
 *     return [{ key: "", tasks: t }];
 *   }, [tasks, filter, groupBy]);
 */
export function useTasks(): Task[] {
  return useContext(TasksContext) ?? [];
}

/**
 * Look up a single task by its stable id OR auto-id. Returns undefined
 * when no match. Linear scan — fine at ~1000 tasks; if we ever get to
 * 100K we'd index, but filemark's scale target is ~1000 (see positioning
 * section of docsi/TASKS_PLAN.md).
 *
 * Primary use: TaskCheckbox's re-hydration of persisted tick state by
 * task id — the checkbox reads the current line, resolves via this
 * lookup, and pulls the Task's parsed metadata.
 */
export function useTaskById(id: string | undefined): Task | undefined {
  const tasks = useTasks();
  if (!id) return undefined;
  return tasks.find((t) => t.id === id || t.stableId === id);
}

/**
 * Look up a task by its source line number. Used when the renderer has
 * access to `node.position.start.line` from mdast — far cheaper than
 * rebuilding an id hash for comparison.
 */
export function useTaskByLine(lineNo: number | undefined): Task | undefined {
  const tasks = useTasks();
  if (lineNo == null) return undefined;
  return tasks.find((t) => t.line === lineNo);
}
