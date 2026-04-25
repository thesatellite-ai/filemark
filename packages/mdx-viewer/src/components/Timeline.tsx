import { isValidElement, type ReactNode } from "react";
import { collectMarkers, isMarker } from "./markerWalk";

/**
 * Timeline — horizontal date-axis with events grouped into lanes.
 *
 *     <Timeline title="Q3 plan" from="2026-07-01" to="2026-09-30">
 *
 *     <Event date="2026-07-15" lane="design"     title="Mocks final" />
 *     <Event date="2026-07-22" lane="eng"        title="Spike done"  />
 *     <Event date="2026-08-10" end="2026-08-24" lane="eng" title="Build phase" />
 *     <Event date="2026-09-01" lane="ship"       title="Launch" highlight />
 *
 *     </Timeline>
 *
 * Each `<Event>` is a marker at `date` (or a bar from `date` to `end`).
 * Lanes auto-derived from the set of `lane=` values; rows preserve
 * insertion order. Today gets a vertical dashed line when within range.
 *
 * `from` / `to` set the visible date window. If omitted they're derived
 * from the events' min/max.
 */
export function Timeline(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const title = asString(props.title);
  const events: Event[] = [];
  for (const el of collectMarkers(props.children, isMarker("Event", "event"))) {
    const p = el.props as Record<string, unknown>;
    const date = parseIso(asString(p.date));
    if (!date) continue;
    const end = parseIso(asString(p.end));
    events.push({
      date,
      end: end ?? null,
      lane: asString(p.lane) || "default",
      title: asString(p.title) || collectText(p.children),
      highlight: p.highlight !== undefined && p.highlight !== false,
    });
  }

  if (events.length === 0) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>Timeline</strong> — needs `&lt;Event date="…" /&gt;` children.
      </div>
    );
  }

  const explicitFrom = parseIso(asString(props.from));
  const explicitTo = parseIso(asString(props.to));
  const dates: number[] = [];
  for (const e of events) {
    dates.push(e.date.getTime());
    if (e.end) dates.push(e.end.getTime());
  }
  const fromMs = explicitFrom?.getTime() ?? Math.min(...dates);
  const toMs = explicitTo?.getTime() ?? Math.max(...dates);
  const span = Math.max(toMs - fromMs, 1); // avoid /0

  // Group events by lane preserving insertion order.
  const laneOrder: string[] = [];
  const byLane = new Map<string, Event[]>();
  for (const e of events) {
    if (!byLane.has(e.lane)) {
      byLane.set(e.lane, []);
      laneOrder.push(e.lane);
    }
    byLane.get(e.lane)!.push(e);
  }

  const todayPct = computePct(Date.now(), fromMs, span);
  const showToday = todayPct >= 0 && todayPct <= 100;

  // Tick labels — 4 evenly-spaced dates
  const ticks: { pct: number; label: string }[] = [];
  for (let i = 0; i <= 3; i++) {
    const t = fromMs + (span * i) / 3;
    ticks.push({ pct: (i / 3) * 100, label: shortDate(new Date(t)) });
  }

  return (
    <section className="bg-card my-6 overflow-hidden rounded-lg border p-4 shadow-sm">
      {title && (
        <h3 className="text-foreground mt-0 mb-3 text-base font-semibold">
          {title}
        </h3>
      )}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="flex">
            <div className="text-muted-foreground w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide" />
            <div className="text-muted-foreground relative h-4 flex-1 text-[10px] tabular-nums">
              {ticks.map((t, i) => (
                <span
                  key={i}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${t.pct}%` }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-border mt-1 h-[1px] w-full" />
          {laneOrder.map((lane) => (
            <div
              key={lane}
              className="border-border/50 flex items-stretch border-b last:border-b-0"
            >
              <div className="text-muted-foreground w-20 shrink-0 px-1 py-3 text-[11px] font-medium">
                {lane}
              </div>
              <div className="relative flex-1 py-2">
                {showToday && (
                  <div
                    className="border-primary/40 pointer-events-none absolute inset-y-0 z-0 border-l-2 border-dashed"
                    style={{ left: `${todayPct}%` }}
                  />
                )}
                {byLane.get(lane)!.map((e, i) => {
                  const startPct = computePct(
                    e.date.getTime(),
                    fromMs,
                    span
                  );
                  if (e.end) {
                    const endPct = computePct(
                      e.end.getTime(),
                      fromMs,
                      span
                    );
                    const widthPct = Math.max(endPct - startPct, 1.5);
                    return (
                      <div
                        key={i}
                        className={[
                          "absolute z-10 flex h-6 items-center rounded px-2 text-[11px] font-medium leading-none whitespace-nowrap",
                          e.highlight
                            ? "bg-primary text-primary-foreground"
                            : "bg-blue-500/80 text-white",
                        ].join(" ")}
                        style={{
                          left: `${startPct}%`,
                          width: `${widthPct}%`,
                          top: "8px",
                        }}
                        title={`${shortDate(e.date)} → ${shortDate(e.end)}`}
                      >
                        <span className="truncate">{e.title}</span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={i}
                      className="absolute z-10 -translate-x-1/2"
                      style={{ left: `${startPct}%`, top: "8px" }}
                      title={shortDate(e.date)}
                    >
                      <div
                        className={[
                          "rotate-45 transform",
                          e.highlight
                            ? "bg-primary"
                            : "bg-emerald-500",
                          "ring-background h-3 w-3 ring-2",
                        ].join(" ")}
                      />
                      <div className="text-foreground bg-background/80 mt-1 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm whitespace-nowrap">
                        {e.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface Event {
  date: Date;
  end: Date | null;
  lane: string;
  title: string;
  highlight: boolean;
}

export function Event(_p: Record<string, unknown>) {
  return null;
}
Event.displayName = "Event";

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function parseIso(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(d.getTime()) ? null : d;
}

function shortDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function computePct(t: number, fromMs: number, span: number): number {
  return ((t - fromMs) / span) * 100;
}

function collectText(node: ReactNode): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (isValidElement(node)) {
    return collectText((node.props as { children?: ReactNode }).children);
  }
  return "";
}
