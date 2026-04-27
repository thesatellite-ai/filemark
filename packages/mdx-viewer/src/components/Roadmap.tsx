import { useEffect, useState, type ReactNode } from "react";
import { collectMarkers, isMarker } from "./markerWalk";

/**
 * Roadmap — multi-lane board (typical "now / next / later", but lane names
 * are free-form). Each lane holds arbitrary markdown children, including
 * nested `<TaskList>` / `<Kanban>` etc.
 *
 *     <Roadmap title="Implementation">
 *
 *     <Lane name="Now" subtitle="this sprint">…</Lane>
 *     <Lane name="Next" tone="info">…</Lane>
 *     <Lane name="Later" tone="muted">…</Lane>
 *
 *     </Roadmap>
 *
 * Layout modes:
 *   - **Default**: responsive grid — vertical stack below `sm`, equal
 *     columns above `sm`. Good for short bullets.
 *   - **`laneMinWidth=`**: switch to a horizontal flex layout where each
 *     lane gets at least the given width (px). Container scrolls when
 *     `lanes × minWidth > viewport`. Use this when lanes hold dense
 *     widgets (nested datagrids, task lists) that need real width.
 *   - **`scroll`** (no value): same as `laneMinWidth=300`.
 *   - **`cols=`**: optional override of the desktop column count (1–6).
 *     Ignored when `laneMinWidth` / `scroll` is set.
 */
export function Roadmap(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const title = asString(props.title);
  // HTML attributes are case-insensitive — rehype-raw lowercases them, so
  // `laneMinWidth="340"` arrives as `laneminwidth`. Read every variant so
  // authors can use camelCase, kebab-case, or all-lowercase.
  const laneMinWidthRaw =
    asString(props.laneMinWidth) ||
    asString(props.laneminwidth) ||
    asString(props["lane-min-width"]) ||
    asString(props.minWidth) ||
    asString(props.minwidth) ||
    asString(props["min-width"]);
  const laneMinWidth = laneMinWidthRaw ? parsePx(laneMinWidthRaw) : null;
  const scrollMode = laneMinWidth !== null || hasFlag(props.scroll);
  const effectiveMinWidth = laneMinWidth ?? (scrollMode ? 300 : 0);
  const colsRaw = asString(props.cols);
  const cols = clampCols(colsRaw);

  const lanes = collectMarkers(props.children, isMarker("Lane", "lane")).map(
    (el) => {
      const p = el.props as Record<string, unknown>;
      return {
        name: asString(p.name) || "Lane",
        subtitle: asString(p.subtitle),
        tone: asString(p.tone) || "default",
        children: (p as { children?: ReactNode }).children,
      };
    }
  );

  const [fullscreen, setFullscreen] = useState(false);
  // Esc exits fullscreen — same convention as DataGrid + MindMap.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  return (
    <section
      className={
        fullscreen
          ? "fv-roadmap-fullscreen bg-card fixed inset-3 z-50 flex flex-col overflow-hidden rounded-lg border p-4 shadow-2xl"
          : "bg-card my-6 overflow-hidden rounded-lg border p-4 shadow-sm"
      }
    >
      {fullscreen && (
        <div
          aria-hidden
          onClick={() => setFullscreen(false)}
          className="bg-background/70 fixed inset-0 -z-10 backdrop-blur-sm"
        />
      )}
      <div className="mb-3 flex items-start justify-between gap-2">
        {title ? (
          <h3 className="text-foreground mt-0 truncate text-base font-semibold">
            {title}
          </h3>
        ) : (
          <span aria-hidden />
        )}
        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          aria-label={fullscreen ? "Exit full screen (Esc)" : "Expand to full screen"}
          title={fullscreen ? "Exit full screen (Esc)" : "Expand to full screen"}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors hover:border-border"
        >
          {fullscreen ? <IconMinimize /> : <IconMaximize />}
        </button>
      </div>
      <div
        className={[
          scrollMode
            ? "flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]"
            : `grid gap-3 ${COLS_CLASS[cols]}`,
          fullscreen && "min-h-0 flex-1",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {lanes.map((l, i) => (
          <div
            key={i}
            className={[
              "flex flex-col rounded-md border p-3",
              scrollMode ? "shrink-0" : "min-w-0 overflow-hidden",
              fullscreen && "min-h-0",
              toneBg(l.tone),
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              scrollMode
                ? { flex: `0 0 ${effectiveMinWidth}px`, minWidth: effectiveMinWidth }
                : undefined
            }
          >
            <header className="mb-2 min-w-0 shrink-0">
              <div className="text-foreground truncate text-[13px] font-semibold uppercase tracking-wide">
                {l.name}
              </div>
              {l.subtitle && (
                <div className="text-muted-foreground mt-0.5 truncate text-[10px] font-medium">
                  {l.subtitle}
                </div>
              )}
            </header>
            <div
              className={[
                "fv-roadmap-body min-w-0 break-words text-[13px] leading-relaxed",
                fullscreen ? "min-h-0 flex-1 overflow-y-auto" : "overflow-x-auto",
              ].join(" ")}
            >
              {l.children}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const COLS_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
  6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-6",
};

function clampCols(s: string): number {
  if (!s) return 3;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(6, n));
}

function parsePx(s: string): number | null {
  const n = parseInt(String(s).replace(/px$/i, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function hasFlag(v: unknown): boolean {
  if (v === true) return true;
  if (v === undefined || v === null || v === false) return false;
  const s = String(v).toLowerCase();
  return s !== "" && s !== "false" && s !== "0" && s !== "no";
}

export function Lane(_p: Record<string, unknown>) {
  return null;
}
Lane.displayName = "Lane";

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function toneBg(tone: string): string {
  switch (tone) {
    case "info":
      return "bg-blue-500/10 border-blue-500/30";
    case "success":
      return "bg-emerald-500/10 border-emerald-500/30";
    case "warn":
      return "bg-amber-500/10 border-amber-500/30";
    case "danger":
      return "bg-rose-500/10 border-rose-500/30";
    case "muted":
      return "bg-muted/40";
    default:
      return "bg-primary/5 border-primary/20";
  }
}

function IconMaximize() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="M3 9V5a2 2 0 0 1 2-2h4" />
      <path d="M21 9V5a2 2 0 0 0-2-2h-4" />
      <path d="M3 15v4a2 2 0 0 0 2 2h4" />
      <path d="M21 15v4a2 2 0 0 1-2 2h-4" />
    </svg>
  );
}

function IconMinimize() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="M9 3v4a2 2 0 0 1-2 2H3" />
      <path d="M15 3v4a2 2 0 0 0 2 2h4" />
      <path d="M9 21v-4a2 2 0 0 0-2-2H3" />
      <path d="M15 21v-4a2 2 0 0 1 2-2h4" />
    </svg>
  );
}
