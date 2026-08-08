import { isValidElement, type ReactNode } from "react";

/**
 * Flatten a React node tree to its plain text content.
 *
 * Accepts `unknown` (not `ReactNode`) so callers can pass raw `props.children`
 * — which is `unknown` after the `el.props as Record<string, unknown>` cast used
 * when reading marker components (`<Item>`, `<Event>`, …) — without a widening
 * cast at the call site. Defensive by construction: anything it can't read as
 * text yields "". Used by the marker-collecting components (Matrix2x2, Timeline,
 * Treemap, Heatmap, Poll, FileTree) that derive a label from children.
 */
export function collectText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  // isValidElement's generic narrows props.children — no cast needed.
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return collectText(node.props.children);
  }
  return "";
}
