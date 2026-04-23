import type { ChartRenderer, ChartType } from "../types";

/**
 * Chart-type registry. Renderers register themselves via
 * `registerChartType(renderer)` at module-load time; `Chart.tsx`
 * looks them up by `options.type`. Adding a new chart type is one
 * new file + one import — NO central switch to edit.
 */
const registry = new Map<ChartType, ChartRenderer>();

export function registerChartType(renderer: ChartRenderer): void {
  registry.set(renderer.type, renderer);
}

export function getChartRenderer(type: ChartType): ChartRenderer | null {
  return registry.get(type) ?? null;
}

export function getRegisteredTypes(): ChartType[] {
  return Array.from(registry.keys());
}

/** Escape hatch for tests or specialized hosts that want a clean slate. */
export function resetRegistry(): void {
  registry.clear();
}
