import { Children, type ReactNode } from "react";

/**
 * Carousel — horizontal scroll-snap row of cards / images. Pure CSS
 * (no JS scroll position state) — fast and accessible.
 *
 *     <Carousel>
 *       <Slide title="One">…</Slide>
 *       <Slide title="Two">…</Slide>
 *     </Carousel>
 *
 * Tip: drop arbitrary React children directly inside `<Carousel>` for
 * raw control; the `<Slide>` wrapper just adds card chrome.
 */
export function Carousel({ children }: { children?: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <div className="fv-carousel my-6">
      <div className="scrollbar-thin flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {items.map((c, i) => (
          <div
            key={i}
            className="snap-start shrink-0"
            style={{ scrollSnapAlign: "start" }}
          >
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Slide(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const title = asString(props.title);
  return (
    <div className="bg-card w-72 rounded-lg border p-3 shadow-sm">
      {title && (
        <div className="text-foreground mb-1 text-[14px] font-semibold leading-tight">
          {title}
        </div>
      )}
      <div className="text-muted-foreground text-[13px] leading-snug">
        {props.children}
      </div>
    </div>
  );
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
