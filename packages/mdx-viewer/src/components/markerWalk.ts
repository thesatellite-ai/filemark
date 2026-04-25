import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * collectMarkers — walk a React subtree and yield every element matching
 * `predicate` regardless of nesting depth.
 *
 * Necessary because the HTML5 parser used by rehype-raw does NOT honor
 * `/>` self-closing on custom (non-void) elements. So when an author
 * writes:
 *
 *     <WeightedScore>
 *     <Criterion name="A" />
 *     <Criterion name="B" />
 *     </WeightedScore>
 *
 * the parser nests Criterion B inside Criterion A. WeightedScore's
 * `Children.forEach` over direct children would see only Criterion A,
 * missing B and any subsequent siblings.
 *
 * This walker descends through `props.children` of every element (skipping
 * the contents of matched markers themselves so a parent matcher doesn't
 * also collect its own grandchildren via the unrelated paths).
 *
 * NOTE: when a marker is matched, its `props.children` ARE walked too —
 * because the HTML parser nests *next sibling markers* into them. The
 * marker's own intentional body content (rare for marker components)
 * gets walked but produces no false positives unless body itself uses
 * the same component type.
 */
export function collectMarkers(
  children: ReactNode,
  predicate: (el: ReactElement) => boolean,
  options?: {
    /**
     * When provided, the walker WILL NOT descend into elements matching
     * this predicate. Use for self-recursive parent components (e.g.
     * DecisionTree) so an outer instance doesn't collect markers from an
     * inner instance's subtree.
     */
    stopAt?: (el: ReactElement) => boolean;
  }
): ReactElement[] {
  const out: ReactElement[] = [];
  walk(children, predicate, options?.stopAt, out);
  return out;
}

function walk(
  node: ReactNode,
  predicate: (el: ReactElement) => boolean,
  stopAt: ((el: ReactElement) => boolean) | undefined,
  out: ReactElement[]
): void {
  if (node == null || node === false) return;
  if (Array.isArray(node)) {
    for (const c of node) walk(c, predicate, stopAt, out);
    return;
  }
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    const matched = predicate(child);
    if (matched) {
      out.push(child);
    }
    // Don't recurse into a stop-at boundary (e.g. a nested DecisionTree
    // inside a Branch). That subtree owns its own marker collection.
    if (stopAt && stopAt(child)) return;
    // Always descend otherwise — siblings get nested by the HTML parser
    // OR react-markdown wraps custom elements in <p> wrappers.
    const sub = (child.props as { children?: ReactNode }).children;
    if (sub !== undefined) walk(sub, predicate, stopAt, out);
  });
}

/**
 * Convenience: build a predicate that matches by displayName OR lowercased
 * tag name. Centralized so every consumer agrees on the contract.
 */
export function isMarker(displayName: string, tagName: string) {
  return (el: ReactElement): boolean => {
    const dname = (el.type as { displayName?: string })?.displayName;
    const tname = typeof el.type === "string" ? el.type : null;
    return dname === displayName || tname === tagName;
  };
}
