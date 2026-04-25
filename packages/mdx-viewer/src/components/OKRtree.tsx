import type { ReactNode } from "react";
import { useTasks } from "@filemark/tasks";

/**
 * OKR tree — Objective → Key Results → optional task-derived progress.
 *
 *     <OKRtree>
 *
 *     <Objective title="Q3: become the planning tool of choice" owner="aman">
 *
 *     <KR title="10K weekly active users" current="6200" target="10000" />
 *     <KR title="Ship 6 Tier-1 components" tasks="task-m9-prfaq,task-m9-rfc,task-m9-pitch,task-m9-postmortem,task-m9-docstatus,task-m9-backlinks" />
 *     <KR title="<2% bounce rate" current="3.4" target="2" inverse />
 *
 *     </Objective>
 *
 *     </OKRtree>
 *
 * Two ways to score a KR:
 *
 *   1. Manual: pass `current` + `target`; bar fills `current/target`.
 *      Add `inverse` for "lower is better" metrics — bar fills as the
 *      gap between current and target shrinks.
 *
 *   2. Auto from tasks: pass `tasks="id1,id2,…"` (without `^`) — looks
 *      up each id in TasksContext, counts `[x]` as done. Bar fills as
 *      `done / total`.
 */

export function OKRtree({ children }: { children?: ReactNode }) {
  return (
    <div className="fv-okrtree my-6 flex flex-col gap-4">{children}</div>
  );
}

export function Objective(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const title = asString(props.title);
  const owner = asString(props.owner);
  const due = asString(props.due);

  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <header className="from-primary/15 to-card border-b bg-gradient-to-r p-4">
        <div className="text-primary mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
          Objective
        </div>
        {title && (
          <h3 className="text-foreground mt-0 mb-0 text-base leading-tight font-semibold">
            {title}
          </h3>
        )}
        {(owner || due) && (
          <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
            {owner && (
              <span>
                <span className="opacity-70">owner</span> {owner}
              </span>
            )}
            {due && (
              <span className="tabular-nums">
                <span className="opacity-70">due</span> {due}
              </span>
            )}
          </div>
        )}
      </header>
      <div className="flex flex-col gap-2 p-3">{props.children}</div>
    </section>
  );
}

export function KR(props: Record<string, unknown>) {
  const title = asString(props.title);
  const target = numOrUndef(props.target);
  const current = numOrUndef(props.current);
  const taskIds = parseList(asString(props.tasks));
  const inverse = props.inverse !== undefined && props.inverse !== false;
  const note = asString(props.note);

  const allTasks = useTasks();
  let progress = 0;
  let scoreLabel = "";

  if (taskIds.length > 0) {
    const refSet = new Set(taskIds);
    const matching = allTasks.filter((t) => t.id && refSet.has(t.id));
    const done = matching.filter((t) => t.status === "done").length;
    const total = matching.length || taskIds.length;
    progress = total === 0 ? 0 : Math.round((done / total) * 100);
    scoreLabel = `${done}/${total} done`;
  } else if (target !== undefined && current !== undefined) {
    if (inverse) {
      // Lower-is-better: full bar at current ≤ target, falls off as
      // current grows beyond target. Stays in [0, 100].
      if (current <= target) progress = 100;
      else {
        const gap = current - target;
        const denom = Math.max(target, 1);
        progress = Math.max(0, Math.round(100 - (gap / denom) * 100));
      }
    } else {
      progress =
        target === 0
          ? 0
          : Math.max(0, Math.min(100, Math.round((current / target) * 100)));
    }
    scoreLabel = `${formatNum(current)} / ${formatNum(target)}`;
  } else {
    scoreLabel = "—";
  }

  const barColor = progress >= 100 ? "bg-emerald-500" : progress >= 70 ? "bg-blue-500" : progress >= 30 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="bg-muted/30 rounded-md border p-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-foreground text-[13px] font-medium">{title}</span>
        <span className="text-muted-foreground shrink-0 tabular-nums text-[11px]">
          {scoreLabel} <span className="ml-1 font-semibold">{progress}%</span>
        </span>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={`${barColor} h-full transition-all`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {note && (
        <p className="text-muted-foreground mt-1.5 text-[11px] italic">
          {note}
        </p>
      )}
    </div>
  );
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function numOrUndef(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function parseList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim().replace(/^\^/, ""))
    .filter(Boolean);
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
