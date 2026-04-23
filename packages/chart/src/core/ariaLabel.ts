import type { ChartOptions } from "../types";

/**
 * Deterministic aria-label for a chart. Screen readers get a sentence
 * summary without us having to template per-renderer strings. When
 * the author supplied a `title`, we prefer that; otherwise compose
 * from the type + axis + series.
 */
export function chartAriaLabel(options: ChartOptions): string {
  if (options.title) {
    return `${options.type} chart — ${options.title}`;
  }
  const series = (options.y ?? (options.value ? [options.value] : [])).join(
    ", ",
  );
  const x = options.x ?? options.name;
  if (series && x) return `${options.type} chart of ${series} by ${x}`;
  if (series) return `${options.type} chart of ${series}`;
  if (x) return `${options.type} chart by ${x}`;
  return `${options.type} chart`;
}
