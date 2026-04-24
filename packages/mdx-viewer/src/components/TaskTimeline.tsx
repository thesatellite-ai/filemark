// ─────────────────────────────────────────────────────────────────────────
// <TaskTimeline md/> — horizontal Gantt-lite from task dates (Phase 5).
//
// Renders tasks with `^start..~due` (or just `~due`) as horizontal bars
// on a date axis. Reads TasksContext. No CSV round-trip — same source
// as every other task view.
//
// Authoring:
//
//   <TaskTimeline md></TaskTimeline>
//   <TaskTimeline md lane="owner"></TaskTimeline>
//   <TaskTimeline md filter="project=launch" lane="status"></TaskTimeline>
//   <TaskTimeline md from="2026-04-01" to="2026-06-30"></TaskTimeline>
//
// Attributes:
//
//   filter   — predicate DSL; same as <TaskList>
//   lane     — group-by key for rows (status | owner | priority | project
//              | tag | file). Tasks with multiple values appear in each
//              matching lane (owner+tag); priority/project/status each
//              appear in one.
//   from     — ISO start of the visible window. Default: 3 days before
//              the earliest task's start/due.
//   to       — ISO end of the visible window. Default: 7 days after the
//              latest task's due.
//   height   — px height of the SVG. Default depends on lane count.
//   title    — optional heading above the timeline.
//
// Design choices:
//
//   - Pure SVG with no external dep. Existing packages are heavy enough;
//     timeline shapes are trivial to draw by hand and stay portable
//     across hosts (playground + chrome-ext without a third-party
//     rendering package).
//
//   - One bar per task. When only `~due` is set (no `^start`), renders
//     a point marker at the due date (instead of a zero-length bar
//     that would be invisible). When both are set, renders a bar.
//
//   - Color by priority (p0/p1/p2/p3 → danger/warn/info/muted). Status
//     "done" / "cancelled" renders the bar with a strikethrough pattern
//     and muted fill.
//
//   - Today marker: vertical dashed line through the current date.
//
//   - Hover: native title attribute with task text + dates. Lightweight
//     tooltip — can upgrade to a React portal later if we want rich
//     content.
//
// Spec: docsi/TASKS_PLAN.md §10.5.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import {
  useTasks,
  filterTasks,
  groupTasks,
  type Task,
  type GroupBy,
} from "@filemark/tasks";

type LaneKey = "status" | "owner" | "priority" | "project" | "tag" | "file";

export function TaskTimeline(props: Record<string, unknown>) {
  const all = useTasks();
  const filter = asString(props.filter);
  const laneAttr = asString(props.lane) || "status";
  const from = asString(props.from);
  const to = asString(props.to);
  const title = asString(props.title);
  const heightAttr = asString(props.height);

  const lane = laneAttr as LaneKey;

  // Apply filter; only keep tasks with at least one date (start or due)
  // so every bar has a position on the axis. Tasks with neither date
  // are silently skipped — they'd have nothing to render anyway.
  const tasks = useMemo(() => {
    let view = filter ? filterTasks(all, filter) : all;
    view = view.filter((t) => t.start?.iso || t.due?.iso);
    return view;
  }, [all, filter]);

  // Compute visible date window. Explicit from/to beats auto-range.
  const { windowStart, windowEnd } = useMemo(() => {
    if (from && to) {
      return { windowStart: parseISO(from), windowEnd: parseISO(to) };
    }
    if (tasks.length === 0) {
      const now = new Date();
      return {
        windowStart: shiftDays(now, -3),
        windowEnd: shiftDays(now, 14),
      };
    }
    let minMs = Infinity;
    let maxMs = -Infinity;
    for (const t of tasks) {
      const s = t.start?.iso ?? t.due?.iso;
      const e = t.due?.iso ?? t.start?.iso;
      if (s) minMs = Math.min(minMs, parseISO(s).getTime());
      if (e) maxMs = Math.max(maxMs, parseISO(e).getTime());
    }
    const start = from
      ? parseISO(from)
      : shiftDays(new Date(minMs), -3);
    const end = to ? parseISO(to) : shiftDays(new Date(maxMs), 7);
    return { windowStart: start, windowEnd: end };
  }, [tasks, from, to]);

  // Group tasks into lanes. Use groupTasks with the requested key.
  const lanes = useMemo(() => {
    if (tasks.length === 0) return [];
    return groupTasks(tasks, lane as GroupBy);
  }, [tasks, lane]);

  // Layout constants.
  const ROW_H = 28;
  const HEADER_H = 32;
  const LANE_LABEL_W = 100;
  const PAD_R = 12;
  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();
  const windowSpanMs = Math.max(1, windowEndMs - windowStartMs);

  // Total visual rows = lane headers + task rows. Previous bug was
  // counting only tasks, so the last N rows (one per lane header)
  // rendered off the bottom of the SVG and got clipped.
  const visualRowCount =
    lanes.reduce((n, l) => n + 1 + l.tasks.length, 0);
  // Intrinsic SVG height — always accommodates every row plus axis
  // header and bottom padding. Container scrolls when this exceeds
  // the explicit `height=` cap.
  const svgHeight = HEADER_H + Math.max(1, visualRowCount) * ROW_H + 16;
  // Container visible height — explicit attr wins, else intrinsic with
  // a sensible default ceiling so very long timelines don't make the
  // whole doc scroll vertically.
  const explicitHeight =
    heightAttr && /^\d+$/.test(heightAttr) ? Number(heightAttr) : 0;
  const containerHeight = explicitHeight || Math.min(svgHeight, 560);

  // Axis ticks — roughly one per week, with smart stepping for wider
  // windows so we don't cram hundreds of labels.
  const ticks = useMemo(() => {
    const days = Math.round(windowSpanMs / 86400000);
    const step = days <= 14 ? 1 : days <= 45 ? 7 : days <= 120 ? 14 : 30;
    const out: Array<{ iso: string; ms: number }> = [];
    const start = new Date(windowStart);
    start.setHours(0, 0, 0, 0);
    for (let d = new Date(start); d <= windowEnd; d = shiftDays(d, step)) {
      out.push({ iso: toISODate(d), ms: d.getTime() });
    }
    return out;
  }, [windowStart, windowEnd, windowSpanMs]);

  // Empty state.
  if (tasks.length === 0) {
    return (
      <section className="fv-task-timeline my-4">
        {title && <h3 className="text-base font-semibold mb-2">{title}</h3>}
        <div className="text-muted-foreground border rounded-md p-3 text-sm italic">
          No tasks with start / due dates match.
        </div>
      </section>
    );
  }

  // Precompute row positions — flatten lanes → rows, remembering the
  // lane header positions for the side labels.
  const rows: Array<{ type: "lane-header" | "task"; lane: string; task?: Task }> = [];
  for (const g of lanes) {
    rows.push({ type: "lane-header", lane: g.key });
    for (const t of g.tasks) rows.push({ type: "task", lane: g.key, task: t });
  }

  const width = 920; // sensible default; SVG will scale via CSS if narrower
  const plotX = LANE_LABEL_W;
  const plotW = width - LANE_LABEL_W - PAD_R;

  const toPx = (ms: number) => plotX + ((ms - windowStartMs) / windowSpanMs) * plotW;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayX = toPx(today.getTime());
  const todayInWindow =
    today.getTime() >= windowStartMs && today.getTime() <= windowEndMs;

  return (
    <section className="fv-task-timeline my-4">
      {title && (
        <h3 className="text-base font-semibold mb-2">
          {title}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            ({tasks.length})
          </span>
        </h3>
      )}
      <div
        className="rounded-md border bg-card overflow-auto"
        style={{ height: containerHeight }}
      >
        <svg
          width={width}
          height={svgHeight}
          viewBox={`0 0 ${width} ${svgHeight}`}
          className="block"
          style={{ minWidth: width }}
          role="img"
          aria-label={title || "Task timeline"}
        >
          {/* Axis background --------------------------------- */}
          <rect x={plotX} y={0} width={plotW} height={svgHeight} fill="transparent" />

          {/* Axis tick labels + vertical grid lines ----------- */}
          {ticks.map((tk) => {
            const x = toPx(tk.ms);
            return (
              <g key={tk.iso}>
                <line
                  x1={x}
                  x2={x}
                  y1={HEADER_H - 4}
                  y2={svgHeight}
                  stroke="var(--border)"
                  strokeWidth="1"
                />
                <text
                  x={x + 3}
                  y={HEADER_H - 8}
                  fontSize="10"
                  fill="var(--muted-foreground)"
                >
                  {shortLabel(tk.iso)}
                </text>
              </g>
            );
          })}

          {/* Header separator --------------------------------- */}
          <line
            x1={0}
            x2={width}
            y1={HEADER_H}
            y2={HEADER_H}
            stroke="var(--border)"
            strokeWidth="1"
          />

          {/* Today marker ------------------------------------- */}
          {todayInWindow && (
            <g>
              <line
                x1={todayX}
                x2={todayX}
                y1={HEADER_H}
                y2={svgHeight}
                stroke="var(--primary)"
                strokeDasharray="3,3"
                strokeWidth="1.5"
                opacity="0.6"
              />
              <text
                x={todayX + 3}
                y={HEADER_H + 10}
                fontSize="9"
                fill="var(--primary)"
              >
                today
              </text>
            </g>
          )}

          {/* Lane headers + task bars ------------------------- */}
          {rows.map((row, i) => {
            const y = HEADER_H + i * ROW_H;
            if (row.type === "lane-header") {
              return (
                <g key={`lh-${i}`}>
                  <rect
                    x={0}
                    y={y}
                    width={width}
                    height={ROW_H}
                    fill="var(--muted)"
                    opacity="0.35"
                  />
                  <text
                    x={8}
                    y={y + ROW_H / 2 + 3}
                    fontSize="10"
                    fontWeight="700"
                    fill="var(--foreground)"
                    style={{ textTransform: "uppercase" }}
                  >
                    {row.lane || "(unset)"}
                  </text>
                </g>
              );
            }
            // Task row.
            const t = row.task!;
            return (
              <TaskBar
                key={`${t.id}-${i}`}
                task={t}
                y={y + 4}
                rowH={ROW_H - 8}
                plotX={plotX}
                plotW={plotW}
                toPx={toPx}
                windowStartMs={windowStartMs}
                windowEndMs={windowEndMs}
              />
            );
          })}
        </svg>
      </div>
    </section>
  );
}

/**
 * Individual task bar. One of three shapes:
 *   - Both start + due → full rectangle
 *   - Due only → small point marker at the due x
 *   - Start only → open-ended arrow from start x to the right edge
 *
 * Outside-the-window clipping: bars that straddle the edge render
 * clamped to the visible plot. Bars fully outside emit nothing.
 */
function TaskBar({
  task,
  y,
  rowH,
  plotX,
  plotW,
  toPx,
  windowStartMs,
  windowEndMs,
}: {
  task: Task;
  y: number;
  rowH: number;
  plotX: number;
  plotW: number;
  toPx: (ms: number) => number;
  windowStartMs: number;
  windowEndMs: number;
}) {
  const startMs = task.start?.iso ? parseISO(task.start.iso).getTime() : null;
  const dueMs = task.due?.iso ? parseISO(task.due.iso).getTime() : null;

  const fillVar = priorityColor(task.priority);
  const isDone = task.status === "done" || task.status === "cancelled";
  const opacity = isDone ? 0.4 : 1;
  const textFill = "var(--background)";

  const title = [
    task.text,
    task.owners.length ? `@${task.owners.join(" @")}` : "",
    task.priority ? task.priority.toUpperCase() : "",
    task.start?.iso ? `start ${task.start.iso}` : "",
    task.due?.iso ? `due ${task.due.iso}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  if (startMs != null && dueMs != null) {
    // Full bar.
    const s = Math.max(startMs, windowStartMs);
    const e = Math.min(dueMs, windowEndMs);
    if (e < windowStartMs || s > windowEndMs) return null;
    const x = toPx(s);
    const w = Math.max(4, toPx(e) - x);
    return (
      <g>
        <title>{title}</title>
        <rect
          x={x}
          y={y}
          width={w}
          height={rowH}
          rx="3"
          ry="3"
          fill={fillVar}
          opacity={opacity}
        />
        {w > 60 && (
          <text
            x={x + 6}
            y={y + rowH / 2 + 3}
            fontSize="10"
            fontWeight="500"
            fill={textFill}
            style={{
              textDecoration: isDone ? "line-through" : "none",
              pointerEvents: "none",
            }}
          >
            {truncate(task.text, Math.floor(w / 6))}
          </text>
        )}
      </g>
    );
  }

  if (dueMs != null) {
    // Due-only point marker (diamond).
    if (dueMs < windowStartMs || dueMs > windowEndMs) return null;
    const x = toPx(dueMs);
    const h = rowH;
    const cy = y + h / 2;
    const r = h / 2;
    return (
      <g>
        <title>{title}</title>
        <polygon
          points={`${x},${cy - r} ${x + r},${cy} ${x},${cy + r} ${x - r},${cy}`}
          fill={fillVar}
          opacity={opacity}
        />
        <text
          x={x + r + 5}
          y={cy + 3}
          fontSize="10"
          fontWeight="500"
          fill="var(--foreground)"
          opacity="0.9"
          style={{
            textDecoration: isDone ? "line-through" : "none",
            pointerEvents: "none",
          }}
        >
          {truncate(task.text, 32)}
        </text>
      </g>
    );
  }

  if (startMs != null) {
    // Start-only open-ended bar → arrow shape.
    if (startMs > windowEndMs) return null;
    const s = Math.max(startMs, windowStartMs);
    const x = toPx(s);
    const w = plotX + plotW - x;
    return (
      <g>
        <title>{title}</title>
        <rect
          x={x}
          y={y}
          width={Math.max(4, w)}
          height={rowH}
          rx="3"
          ry="3"
          fill={fillVar}
          opacity={opacity * 0.6}
        />
        <text
          x={x + 6}
          y={y + rowH / 2 + 3}
          fontSize="10"
          fontWeight="500"
          fill={textFill}
          style={{ pointerEvents: "none" }}
        >
          {truncate(task.text, Math.floor(w / 6))}
        </text>
      </g>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function priorityColor(p: string | undefined): string {
  switch (p) {
    case "p0":
      return "oklch(0.6 0.2 25)"; // red
    case "p1":
      return "oklch(0.72 0.17 85)"; // amber
    case "p2":
      return "oklch(0.65 0.14 240)"; // blue
    case "p3":
      return "oklch(0.55 0.02 250)"; // muted
    default:
      return "oklch(0.55 0.05 250)"; // neutral
  }
}

function parseISO(iso: string): Date {
  // Avoid timezone drift — parse as local date, not UTC.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function shiftDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

/** Short axis label — "MMM DD" for human reading. */
function shortLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}`;
}

function truncate(s: string, max: number): string {
  if (max <= 0) return "";
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)) + "…";
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
