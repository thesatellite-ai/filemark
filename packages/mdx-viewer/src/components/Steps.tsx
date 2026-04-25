import type { ReactNode } from "react";
import { collectMarkers, isMarker } from "./markerWalk";

/**
 * Steps — numbered guided walkthrough (install / setup / how-to).
 *
 *     <Steps>
 *
 *     <Step title="Install">…</Step>
 *     <Step title="Configure">…</Step>
 *     <Step title="Verify">…</Step>
 *
 *     </Steps>
 *
 * Auto-numbers in document order. Pass `n="3"` to override (useful when
 * splitting a long flow across docs). Last step gets a "complete" tone.
 */
export function Steps(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const items = collectMarkers(
    props.children,
    isMarker("Step", "step")
  ).map((el) => {
    const p = el.props as Record<string, unknown>;
    return {
      n: p.n != null ? Number(p.n) : null,
      title: asString(p.title),
      children: (p as { children?: ReactNode }).children,
    };
  });

  if (items.length === 0) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>Steps</strong> — needs `&lt;Step&gt;` children.
      </div>
    );
  }

  return (
    <ol className="fv-steps my-6 flex list-none flex-col gap-3 p-0">
      {items.map((s, i) => {
        const num = s.n ?? i + 1;
        return (
          <li
            key={i}
            className="m-0 flex items-start gap-3 p-0"
          >
            <span className="bg-primary text-primary-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums">
              {num}
            </span>
            <div className="bg-card flex-1 rounded-md border p-3">
              {s.title && (
                <div className="text-foreground mb-1 text-[14px] font-semibold leading-tight">
                  {s.title}
                </div>
              )}
              <div className="fv-steps-body text-sm leading-relaxed">
                {s.children}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Step(_p: Record<string, unknown>) {
  return null;
}
Step.displayName = "Step";

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
