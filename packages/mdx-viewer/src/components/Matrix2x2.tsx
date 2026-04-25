import { isValidElement, type ReactNode } from "react";
import { collectMarkers, isMarker } from "./markerWalk";

/**
 * Matrix2x2 — classic prioritization grid (Impact × Effort, RICE,
 * Eisenhower urgent/important, etc.).
 *
 *     <Matrix2x2 x-axis="Effort" y-axis="Impact">
 *
 *     <Item x="0.2" y="0.9">Reveal-in-sidebar</Item>
 *     <Item x="0.7" y="0.4">Whiteboard</Item>
 *     <Item x="0.3" y="0.7">Backlinks</Item>
 *     <Item x="0.8" y="0.8">GraphView</Item>
 *
 *     </Matrix2x2>
 *
 * Coords are 0..1 — (0,0) is bottom-left of the inner grid.
 *
 * Quadrants (clockwise from top-left): "Quick wins", "Big bets",
 * "Time sinks", "Fillers". Override with `quadrants="A,B,C,D"` if
 * you want different labels (clockwise from top-left).
 *
 * Coloured by quadrant. Items at the same coord cluster slightly
 * (no jitter — read whatever the author wrote).
 */
export function Matrix2x2(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const xAxis =
    asString(props["x-axis"] ?? props.xAxis) || "Effort →";
  const yAxis =
    asString(props["y-axis"] ?? props.yAxis) || "Impact ↑";
  const quadrantLabels =
    parseList(asString(props.quadrants)) ||
    ["Quick wins", "Big bets", "Fillers", "Time sinks"];
  const title = asString(props.title);

  const items: Item[] = collectMarkers(
    props.children,
    isMarker("Item", "item")
  ).map((el) => {
    const p = el.props as Record<string, unknown>;
    return {
      x: clamp01(numOrDefault(p.x, 0.5)),
      y: clamp01(numOrDefault(p.y, 0.5)),
      label: collectText(p.children),
    };
  });

  return (
    <section className="bg-card my-6 overflow-hidden rounded-lg border p-5 shadow-sm">
      {title && (
        <h3 className="text-foreground mt-0 mb-3 text-base font-semibold">
          {title}
        </h3>
      )}
      <div className="text-muted-foreground mb-2 flex items-center justify-between text-[11px] font-medium">
        <span aria-hidden />
        <span>↑ {yAxis}</span>
        <span aria-hidden />
      </div>
      <div className="relative aspect-square w-full max-w-[520px] mx-auto">
        {/* 4 quadrant cells with subtle tone */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 overflow-hidden rounded-lg border-2">
          <div className="border-foreground/10 border-b border-r bg-emerald-500/10 p-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-700/70 dark:text-emerald-300/80">
            {quadrantLabels[0]}
          </div>
          <div className="border-foreground/10 border-b bg-blue-500/10 p-2 text-right text-[10px] font-semibold uppercase tracking-wide text-blue-700/70 dark:text-blue-300/80">
            {quadrantLabels[1]}
          </div>
          <div className="border-foreground/10 border-r bg-zinc-500/10 p-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-700/70 dark:text-zinc-300/80">
            {quadrantLabels[2]}
          </div>
          <div className="bg-rose-500/10 p-2 text-right text-[10px] font-semibold uppercase tracking-wide text-rose-700/70 dark:text-rose-300/80">
            {quadrantLabels[3]}
          </div>
        </div>
        {/* Items as positioned dots */}
        {items.map((it, i) => (
          <div
            key={i}
            className="absolute z-10 -translate-x-1/2 translate-y-1/2"
            style={{
              left: `${it.x * 100}%`,
              bottom: `${it.y * 100}%`,
            }}
            title={it.label}
          >
            <div className="bg-primary ring-background h-3 w-3 rounded-full ring-2" />
            <div className="text-foreground bg-background/80 mt-1 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm">
              {it.label}
            </div>
          </div>
        ))}
      </div>
      <div className="text-muted-foreground mt-2 text-center text-[11px] font-medium">
        {xAxis} →
      </div>
    </section>
  );
}

interface Item {
  x: number;
  y: number;
  label: string;
}

export function Item(_p: Record<string, unknown>) {
  return null;
}
Item.displayName = "Item";

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function numOrDefault(v: unknown, fallback: number): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function parseList(s: string): string[] | null {
  const out = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return out.length === 4 ? out : null;
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
