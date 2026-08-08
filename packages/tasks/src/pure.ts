// React-free entry point for @filemark/tasks.
//
// Same parser / serializer / type surface as the main barrel MINUS the React
// context (TasksProvider / useTasks / useTaskById / useTaskByLine). Hosts that
// only need to PARSE tasks — a VS Code extension host, a Node script, any
// non-React consumer — import this so `import "react"` never enters their
// bundle. The main barrel (`.`) re-exports everything here plus the context.

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
