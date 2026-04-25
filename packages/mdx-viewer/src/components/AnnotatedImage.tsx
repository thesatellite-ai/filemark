import { useState, type ReactNode } from "react";
import { collectMarkers, isMarker } from "./markerWalk";

/**
 * AnnotatedImage — image with numbered hotspots that pop a markdown
 * popover.
 *
 *     <AnnotatedImage src="./screenshot.png" alt="Filemark UI">
 *
 *     <Hotspot x="0.18" y="0.42">Sidebar — files + tabs</Hotspot>
 *     <Hotspot x="0.62" y="0.78">Task panel — cross-file aggregator</Hotspot>
 *
 *     </AnnotatedImage>
 *
 * x / y are normalised 0..1 (left/top origin). Hotspots render as
 * numbered pins; click toggles a popover showing the markdown body.
 */
export function AnnotatedImage(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const src = asString(props.src);
  const alt = asString(props.alt);
  const caption = asString(props.caption);
  const [active, setActive] = useState<number | null>(null);

  const hotspots = collectMarkers(
    props.children,
    isMarker("Hotspot", "hotspot")
  ).map((el) => {
    const p = el.props as Record<string, unknown>;
    return {
      x: clamp01(numOr(p.x, 0.5)),
      y: clamp01(numOr(p.y, 0.5)),
      label: asString(p.label),
      body: (p as { children?: ReactNode }).children,
    };
  });

  if (!src) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>AnnotatedImage</strong> — needs `src=` prop.
      </div>
    );
  }

  return (
    <figure className="fv-annotated-image my-6">
      <div className="bg-muted/15 relative inline-block max-w-full overflow-hidden rounded-lg border">
        <img src={src} alt={alt} className="block max-w-full" />
        {hotspots.map((h, i) => {
          const isActive = active === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(isActive ? null : i)}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
              aria-label={`Hotspot ${i + 1}${h.label ? `: ${h.label}` : ""}`}
            >
              <span
                className={[
                  "ring-background flex size-6 items-center justify-center rounded-full text-[11px] font-bold ring-2 transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground scale-110"
                    : "bg-card text-foreground hover:bg-primary hover:text-primary-foreground",
                ].join(" ")}
              >
                {i + 1}
              </span>
            </button>
          );
        })}
      </div>
      {active != null && hotspots[active] && (
        <div className="bg-card mt-2 rounded-md border p-3 text-sm leading-relaxed">
          <div className="text-primary mb-1 text-[11px] font-semibold uppercase tracking-wide">
            Hotspot {active + 1}
            {hotspots[active].label && ` · ${hotspots[active].label}`}
          </div>
          <div>{hotspots[active].body}</div>
        </div>
      )}
      {caption && (
        <figcaption className="text-muted-foreground mt-2 text-center text-[12px] italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export function Hotspot(_p: Record<string, unknown>) {
  return null;
}
Hotspot.displayName = "Hotspot";

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function numOr(v: unknown, fallback: number): number {
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
