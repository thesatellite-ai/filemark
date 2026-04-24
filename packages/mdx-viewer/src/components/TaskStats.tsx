// ─────────────────────────────────────────────────────────────────────────
// <TaskStats md/> — KPI tile grid computed from the current doc's tasks.
//
// Wraps our existing <Stats> / <Stat> primitives. Reads TasksContext, runs
// the configured filter (if any), and emits a row of small cards showing:
//
//   Total · Todo · In progress · Blocked · Done · Overdue · Today · This week
//
// Author writes:
//
//   <TaskStats md/>                    — every task in the current doc
//   <TaskStats md filter="project=launch"/>
//   <TaskStats md cols="4"/>
//
// `md` is a presence-only flag (signals "derive from markdown tasks" —
// reserved for a future `src=./file.md` mode). Currently every use of
// this component sources from TasksContext; the `md` attr is purely a
// convention marker that mirrors `<Kanban md>` styling.
//
// Spec: docsi/TASKS_PLAN.md §10.4.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { useTasks, filterTasks, type Task } from "@filemark/tasks";
import { Stats, Stat } from "./Stats";

export function TaskStats(props: Record<string, unknown>) {
  const tasks = useTasks();
  const filter = asString(props.filter);
  const cols = asString(props.cols);

  const counts = useMemo(() => computeCounts(tasks, filter), [tasks, filter]);

  return (
    <Stats cols={cols || "4"}>
      <Stat title="Total" value={counts.total} />
      <Stat
        title="Todo"
        value={counts.todo}
        intent={counts.todo > 0 ? "info" : "muted"}
      />
      <Stat
        title="In progress"
        value={counts.wip}
        intent={counts.wip > 0 ? "primary" : "muted"}
      />
      <Stat
        title="Blocked"
        value={counts.blocked}
        intent={counts.blocked > 0 ? "warn" : "muted"}
      />
      <Stat title="Done" value={counts.done} intent="success" />
      <Stat
        title="Overdue"
        value={counts.overdue}
        intent={counts.overdue > 0 ? "danger" : "muted"}
      />
      <Stat
        title="Today"
        value={counts.today}
        intent={counts.today > 0 ? "warn" : "muted"}
      />
      <Stat title="This week" value={counts.thisWeek} intent="info" />
    </Stats>
  );
}

interface Counts {
  total: number;
  todo: number;
  wip: number;
  done: number;
  blocked: number;
  question: number;
  cancelled: number;
  overdue: number;
  today: number;
  thisWeek: number;
}

function computeCounts(tasks: Task[], filter: string): Counts {
  const view = filter ? filterTasks(tasks, filter) : tasks;
  const now = new Date();
  const todayISO = toISODate(now);
  const eow = new Date(now);
  const day = eow.getDay();
  eow.setDate(eow.getDate() + (day === 0 ? 0 : 7 - day));
  const eowISO = toISODate(eow);

  const c: Counts = {
    total: view.length,
    todo: 0,
    wip: 0,
    done: 0,
    blocked: 0,
    question: 0,
    cancelled: 0,
    overdue: 0,
    today: 0,
    thisWeek: 0,
  };

  for (const t of view) {
    c[t.status]++;
    const due = t.due?.iso;
    if (due && t.status !== "done" && t.status !== "cancelled") {
      if (due < todayISO) c.overdue++;
      if (due === todayISO) c.today++;
      if (due >= todayISO && due <= eowISO) c.thisWeek++;
    }
  }

  return c;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
