import type { ReactNode } from "react";
import { collectMarkers, isMarker } from "./markerWalk";

/**
 * Roadmap — three-column "now / next / later" board (or arbitrary
 * lane names). Each lane holds free-form children.
 *
 *     <Roadmap>
 *
 *     <Lane name="Now" subtitle="this sprint">
 *
 *     - Ship M11 Tier 3
 *     - Backlinks polish
 *
 *     </Lane>
 *
 *     <Lane name="Next" subtitle="next sprint" tone="info">
 *
 *     - GraphView
 *     - Chart annotations
 *
 *     </Lane>
 *
 *     <Lane name="Later" subtitle="someday" tone="muted">
 *
 *     - Whiteboard
 *     - Voice capture
 *
 *     </Lane>
 *
 *     </Roadmap>
 */
export function Roadmap(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const title = asString(props.title);
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

  return (
    <section className="bg-card my-6 overflow-hidden rounded-lg border p-4 shadow-sm">
      {title && (
        <h3 className="text-foreground mt-0 mb-3 text-base font-semibold">
          {title}
        </h3>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {lanes.map((l, i) => (
          <div
            key={i}
            className={[
              "rounded-md border p-3",
              toneBg(l.tone),
            ].join(" ")}
          >
            <header className="mb-2">
              <div className="text-foreground text-[13px] font-semibold uppercase tracking-wide">
                {l.name}
              </div>
              {l.subtitle && (
                <div className="text-muted-foreground mt-0.5 text-[10px] font-medium">
                  {l.subtitle}
                </div>
              )}
            </header>
            <div className="fv-roadmap-body text-[13px] leading-relaxed">
              {l.children}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
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
