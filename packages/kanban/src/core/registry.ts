import type { CardRenderer } from "../types";

/**
 * Card-layout registry. Cards register themselves via
 * `registerCardRenderer()` at module-load time; `<Card>` looks them
 * up by `options.cardLayout` (default: `"default"`).
 *
 * Custom card layouts plug in without touching any central file —
 * mirror of the chart registry's contract.
 */
const registry = new Map<string, CardRenderer>();

export function registerCardRenderer(renderer: CardRenderer): void {
  registry.set(renderer.id, renderer);
}

export function getCardRenderer(id: string): CardRenderer | null {
  return registry.get(id) ?? null;
}

export function getRegisteredLayouts(): string[] {
  return Array.from(registry.keys());
}
