import type { ChartOptions } from "../../types";

/**
 * Emit recharts `<ReferenceLine>` elements for every annotation in
 * `options.annotations`. Each annotation draws a dashed vertical line
 * at its x-value with an optional label.
 *
 * Called from inside categorical renderers (bar / line / area) as a
 * sibling of the data series. Returns an array so the caller can
 * spread it inline.
 */
export function renderAnnotations(
  R: typeof import("recharts"),
  options: ChartOptions,
): React.ReactNode[] {
  if (!options.annotations || options.annotations.length === 0) return [];
  return options.annotations.map((a, i) => (
    <R.ReferenceLine
      key={`ann-${i}-${a.x}`}
      x={a.x}
      stroke="currentColor"
      strokeDasharray="3 3"
      strokeOpacity={0.4}
      label={
        a.label
          ? {
              value: a.label,
              position: "insideTop",
              fill: "currentColor",
              fontSize: 10,
              opacity: 0.75,
            }
          : undefined
      }
    />
  ));
}
