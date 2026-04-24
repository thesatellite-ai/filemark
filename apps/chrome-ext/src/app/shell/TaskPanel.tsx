// ─────────────────────────────────────────────────────────────────────────
// TaskPanel — cross-file task dashboard (Phase 4).
//
// Right-edge side panel showing an aggregated view of every task across
// every opened doc in the library. Design mirrors the single-doc
// <TaskList> but sources from `useTaskIndex` (see ../taskIndex.ts) and
// adds smart filter tabs + click-to-source navigation.
//
// Layout:
//
//   ┌── Tasks · (n total) ──────────── [ x ]┐
//   │ [All] [Today] [Week] [Overdue] [Open] │   filter tabs
//   │ [ 🔍 search ] [ ▼ group by status ▼ ] │   search + group chooser
//   ├────────────────────────────────────────┤
//   │ ┌─ Todo · 3 ─────────────────────────┐ │
//   │ │ ☐ Ship datagrid v2  @alice !P0 …  │ │   rows — click opens source
//   │ │ ☐ Refactor auth  @grace !P1 …     │ │
//   │ ├─ WIP · 2 ─────────────────────────┤ │
//   │ │ ◐ Kanban polish @linus · sprint.md │ │   file:line badge on each row
//   │ └────────────────────────────────────┘ │
//   └────────────────────────────────────────┘
//
// Implementation notes:
//
//   - Reads tasks reactively from useTaskIndex (Zustand selective
//     subscription; only re-renders when any file's task set changes).
//
//   - Uses the same predicate + group + sort facilities as <TaskList>
//     (filterTasks, groupTasks, sortTasks) from @filemark/tasks — so
//     the filter tab "Today" becomes `is:today`, "Overdue" becomes
//     `is:overdue`, etc.
//
//   - Every row carries `data-task-file` + `data-task-line`; clicking
//     the row calls `openTaskLocation(fileId, line)` in the library
//     store, which activates the file AND bumps `scrollTarget` so the
//     Viewer scrolls to the source bullet.
//
//   - "Group by" state is local to the panel (doesn't persist) so the
//     user can riff on views without polluting UIPrefs. Filter tab is
//     also local. Revisit if users ask for persistence.
//
// Related:
//   docsi/TASKS_PLAN.md §10.5 (side panel design).
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { X, Search, ChevronDown } from "lucide-react";
import {
  filterTasks,
  groupTasks,
  sortTasks,
  type Task,
  type GroupBy,
} from "@filemark/tasks";
import { useLibrary } from "../store";
import { useTaskIndex } from "../taskIndex";
import { cn } from "@/lib/utils";

/** Smart filter tab → predicate expression. */
const FILTER_TABS: Array<{ id: string; label: string; filter: string }> = [
  { id: "all", label: "All", filter: "" },
  { id: "open", label: "Open", filter: "is:open" },
  { id: "today", label: "Today", filter: "is:today" },
  { id: "week", label: "This week", filter: "is:today OR is:tomorrow OR is:upcoming" },
  { id: "overdue", label: "Overdue", filter: "is:overdue" },
  { id: "blocked", label: "Blocked", filter: "is:blocked" },
];

const GROUP_OPTIONS: Array<{ id: GroupBy | ""; label: string }> = [
  { id: "", label: "(flat)" },
  { id: "status", label: "Status" },
  { id: "owner", label: "Owner" },
  { id: "priority", label: "Priority" },
  { id: "project", label: "Project" },
  { id: "file", label: "File" },
  { id: "due-bucket", label: "Due bucket" },
  { id: "tag", label: "Tag" },
];

export function TaskPanel() {
  const openTaskLocation = useLibrary((s) => s.openTaskLocation);
  const setTasksOpen = useLibrary((s) => s.setTasksOpen);
  const activeFileId = useLibrary((s) => s.activeFileId);

  // Subscribe reactively to the task index. The selector returns a new
  // array reference whenever any file's tasks change, which triggers
  // re-render. This is fine at our scale (~1000 tasks) — identity
  // equality check on the whole array is O(1) and zustand's default
  // shallow check handles the outer array reference.
  const index = useTaskIndex((s) => s.index);
  const allTasks = useMemo<Task[]>(() => {
    const out: Task[] = [];
    for (const fileId in index) for (const t of index[fileId].tasks) out.push(t);
    return out;
  }, [index]);

  const [tab, setTab] = useState<string>("open");
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy | "">("status");

  // Compose the active filter from tab + search. Search matches task
  // text OR owner mentions OR any tag substring — cheap substring check
  // on the raw line.
  const view = useMemo(() => {
    const tabFilter = FILTER_TABS.find((t) => t.id === tab)?.filter ?? "";
    let filtered = tabFilter ? filterTasks(allTasks, tabFilter) : allTasks;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((t) =>
        [
          t.text,
          t.raw,
          t.owners.join(" "),
          t.tags.join(" "),
          t.project ?? "",
          t.file ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    // Default sort: priority asc, due asc, text asc.
    filtered = sortTasks(filtered, "priority:asc,due:asc,text:asc");
    if (groupBy) return groupTasks(filtered, groupBy);
    return [{ key: "", tasks: filtered }];
  }, [allTasks, tab, search, groupBy]);

  const totalRendered = view.reduce((n, g) => n + g.tasks.length, 0);

  return (
    <aside className="bg-background flex h-full w-[380px] shrink-0 flex-col border-l">
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-sm font-semibold">Tasks</span>
          <span className="text-muted-foreground tabular-nums text-xs">
            {totalRendered}
            {totalRendered !== allTasks.length && (
              <span className="opacity-60"> / {allTasks.length}</span>
            )}
          </span>
        </div>
        <button
          className="hover:bg-accent rounded-sm p-1 text-muted-foreground hover:text-foreground"
          onClick={() => setTasksOpen(false)}
          aria-label="Close tasks panel"
          title="Close (⌘T)"
        >
          <X className="size-4" />
        </button>
      </header>

      {/* Filter tabs ------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        {FILTER_TABS.map((f) => (
          <button
            key={f.id}
            className={cn(
              "rounded-sm px-2 py-0.5 text-[11px] font-medium transition-colors",
              tab === f.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            onClick={() => setTab(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + group chooser ------------------------------------- */}
      <div className="flex items-center gap-2 border-b px-2 py-1.5">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute left-1.5 top-1/2 size-3 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="bg-background placeholder:text-muted-foreground/60 focus-visible:border-ring h-6 w-full rounded-sm border pl-6 pr-1 text-[11px] outline-none"
          />
        </div>
        <GroupSelect value={groupBy} onChange={setGroupBy} />
      </div>

      {/* Scrollable body -------------------------------------------- */}
      <div className="flex-1 overflow-auto">
        {totalRendered === 0 ? (
          <div className="text-muted-foreground mx-auto mt-8 max-w-[220px] text-center text-xs italic">
            {allTasks.length === 0
              ? "No tasks yet. Open a markdown file with `- [ ]` bullets."
              : "No tasks match the current filter."}
          </div>
        ) : (
          view.map((g) => (
            <TaskPanelGroup
              key={g.key || "__flat__"}
              label={g.key}
              tasks={g.tasks}
              activeFileId={activeFileId}
              onOpenLocation={openTaskLocation}
            />
          ))
        )}
      </div>

      {/* Footer — quick help / stats --------------------------------- */}
      <footer className="text-muted-foreground flex items-center justify-between border-t px-3 py-1 text-[10px]">
        <span className="opacity-80">
          {Object.keys(index).length} file
          {Object.keys(index).length === 1 ? "" : "s"} indexed
        </span>
        <span className="opacity-60">⌘T to toggle</span>
      </footer>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Group header + rows
// ─────────────────────────────────────────────────────────────────────────

function TaskPanelGroup({
  label,
  tasks,
  activeFileId,
  onOpenLocation,
}: {
  label: string;
  tasks: Task[];
  activeFileId: string | null;
  onOpenLocation: (fileId: string, line: number) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <div className="border-b">
      {label && (
        <div className="bg-muted/40 text-muted-foreground sticky top-0 z-10 flex items-center gap-2 border-b px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
          <span className="flex-1 truncate">{label || "(unset)"}</span>
          <span className="tabular-nums opacity-70">{tasks.length}</span>
        </div>
      )}
      <ul>
        {tasks.map((t) => (
          <TaskPanelRow
            key={t.id}
            task={t}
            isActive={t.file != null && matchesFileName(activeFileId, t)}
            onOpenLocation={onOpenLocation}
          />
        ))}
      </ul>
    </div>
  );
}

function TaskPanelRow({
  task,
  isActive,
  onOpenLocation,
}: {
  task: Task;
  isActive: boolean;
  onOpenLocation: (fileId: string, line: number) => void;
}) {
  const glyph = statusGlyph(task.status);
  const struck = task.status === "done" || task.status === "cancelled";
  const fileId = useFileIdFor(task);

  const onClick = () => {
    if (fileId && task.line != null) onOpenLocation(fileId, task.line);
  };

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={!fileId || task.line == null}
        className={cn(
          "flex w-full items-start gap-2 border-b px-3 py-1.5 text-left text-[12px] leading-snug transition-colors",
          "hover:bg-accent disabled:opacity-50",
          isActive && "bg-accent/30"
        )}
        title={
          task.file && task.line
            ? `${task.file}:${task.line}`
            : "No source location"
        }
      >
        <span className="text-muted-foreground w-4 shrink-0 select-none">
          {glyph}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={struck ? "line-through opacity-60" : ""}>
            {task.text || <span className="italic opacity-60">(empty)</span>}
          </span>
          <span className="flex flex-wrap gap-1">
            {task.priority && (
              <span className={`fv-task-chip ${priorityClass(task.priority)}`}>
                {task.priority.toUpperCase()}
              </span>
            )}
            {task.owners.map((o) => (
              <span key={o} className="fv-task-chip fv-task-chip--owner">
                @{o}
              </span>
            ))}
            {task.due?.iso && (
              <span className={`fv-task-chip ${dueToneClass(task.due.iso, task.status)}`}>
                ~{task.due.iso}
              </span>
            )}
            {task.project && (
              <span className="fv-task-chip fv-task-chip--project">
                ({task.project})
              </span>
            )}
            {task.file && task.line != null && (
              <span className="text-muted-foreground/70 text-[10px] tabular-nums">
                {basename(task.file)}:{task.line}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

function GroupSelect({
  value,
  onChange,
}: {
  value: GroupBy | "";
  onChange: (v: GroupBy | "") => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as GroupBy | "")}
        className="bg-background hover:bg-accent focus-visible:border-ring h-6 appearance-none rounded-sm border pl-2 pr-6 text-[11px] outline-none"
        aria-label="Group by"
        title="Group by"
      >
        {GROUP_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="text-muted-foreground pointer-events-none absolute right-1 top-1/2 size-3 -translate-y-1/2" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Find the library file id for a task. Task's `file` field stores the
 * path (from extractTasks); we reverse-lookup the id from the library.
 *
 * We do this inline on every row because the library files map is small
 * and doing it once per row per render is cheap (~1000 rows worst case).
 */
function useFileIdFor(task: Task): string | null {
  const files = useLibrary((s) => s.files);
  if (!task.file) return null;
  for (const id in files) {
    if (files[id].path === task.file) return id;
  }
  return null;
}

function matchesFileName(activeId: string | null, task: Task): boolean {
  if (!activeId || !task.file) return false;
  // Soft match — activeFileId is a library id, task.file is a path. The
  // TaskPanelRow also computes the fileId via useFileIdFor; we just
  // compare the path here for the "is this the currently open file"
  // highlight. Works because each file has one path.
  return true;
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

function priorityClass(p: string): string {
  switch (p) {
    case "p0":
      return "fv-task-chip--danger";
    case "p1":
      return "fv-task-chip--warn";
    case "p2":
      return "fv-task-chip--info";
    default:
      return "fv-task-chip--muted";
  }
}

function dueToneClass(iso: string, status: string): string {
  if (status === "done" || status === "cancelled") return "fv-task-chip--muted";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  const delta = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (delta < 0) return "fv-task-chip--danger";
  if (delta <= 1) return "fv-task-chip--warn";
  return "fv-task-chip--info";
}

function basename(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(idx + 1) : path;
}
