import type { ReactNode } from "react";
import { collectMarkers, isMarker } from "./markerWalk";

/**
 * FiveWhys — root-cause analysis chain.
 *
 *     <FiveWhys problem="Deploy broke production">
 *
 *     <Why>The migration ran out of order.</Why>
 *     <Why>The deploy script doesn't sequence migrations against feature flags.</Why>
 *     <Why>Nobody owns the deploy script.</Why>
 *     <Why>It was inherited from the previous team.</Why>
 *     <Why>We never had an "infra DRI" role.</Why>
 *
 *     </FiveWhys>
 *
 * Renders the problem as a header card, then numbered Why blocks
 * connected by arrows. The last Why is a plausible root cause —
 * style it slightly distinct so the chain "lands."
 */
export function FiveWhys(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const problem = asString(props.problem);
  const whys: ReactNode[] = collectMarkers(
    props.children,
    isMarker("Why", "why")
  ).map((el) => (el.props as { children?: ReactNode }).children);

  return (
    <section className="bg-card my-6 overflow-hidden rounded-lg border p-5 shadow-sm">
      <header className="mb-4">
        <div className="text-primary mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
          5 Whys
        </div>
        {problem && (
          <h3 className="text-foreground mt-0 mb-0 text-base leading-snug font-semibold">
            {problem}
          </h3>
        )}
      </header>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {whys.map((w, i) => {
          const isLast = i === whys.length - 1;
          return (
            <li key={i} className="m-0 flex items-start gap-3 p-0">
              <span
                className={[
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                  isLast
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {i + 1}
              </span>
              <div
                className={[
                  "flex-1 rounded-md border p-3 text-sm leading-relaxed",
                  isLast
                    ? "border-primary/40 bg-primary/5 font-medium"
                    : "bg-muted/30",
                ].join(" ")}
              >
                <span className="text-muted-foreground mr-1.5 text-[11px] font-semibold uppercase tracking-wide">
                  Why?
                </span>
                {w}
                {isLast && (
                  <div className="text-primary mt-1.5 text-[11px] font-semibold uppercase tracking-wide">
                    ↳ root cause
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function Why(_p: Record<string, unknown>) {
  return null;
}
Why.displayName = "Why";

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
