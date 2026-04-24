// ─────────────────────────────────────────────────────────────────────────
// @filemark/tasks — public barrel.
//
// Spec: docsi/TASKS_PLAN.md  (read this first for any substantive change)
//
// Ship surface kept narrow for v1.0:
//   - Types (Task, TaskStatus, Priority, TimeValue, …)
//   - Single-line parser (parseTaskLine)
//   - Doc-level extractor (extractTasks)
//   - Round-trip serializer (serializeTask / serializeTaskLine)
//   - React context (TasksProvider / useTasks / useTaskById / useTaskByLine)
//
// Everything else in the plan (predicate DSL, groupTasks, sortTasks,
// recurrence, dependency graph, LSP, exporters) comes in later phases.
// Keep this barrel SMALL — fewer exports = fewer accidental public APIs
// to maintain.
// ─────────────────────────────────────────────────────────────────────────

export type {
  Task,
  TaskStatus,
  Priority,
  TimeValue,
  Duration,
  Money,
  TaskLink,
  TaskDependency,
  Diagnostic,
  TaskDefaults,
  GroupBy,
  SortSpec,
  TasksVersion,
} from "./types";

export { parseTaskLine } from "./parseLine";
export { extractTasks } from "./extractTasks";
export { serializeTask, serializeTaskLine } from "./serialize";
export {
  TasksProvider,
  useTasks,
  useTaskById,
  useTaskByLine,
} from "./context";
export { filterTasks, parseFilter, resolveBlockers } from "./predicate";
export { groupTasks, sortTasks, parseSortSpec } from "./group";
