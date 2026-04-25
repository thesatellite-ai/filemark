import {
  Children,
  isValidElement,
  type ReactNode,
} from "react";

/**
 * Diff — side-by-side before/after code blocks for migration guides
 * + refactor PRs.
 *
 *     <Diff>
 *
 *     ```ts before
 *     const x = items.map(i => i.foo);
 *     ```
 *
 *     ```ts after
 *     const x = items.flatMap(i => i.foo ?? []);
 *     ```
 *
 *     </Diff>
 *
 * Pulls the first two fenced code blocks inside; the one with `before`
 * meta becomes the LEFT pane, `after` the RIGHT. Without explicit
 * meta, the first block is treated as before, the second as after.
 *
 * Side-by-side on viewport ≥ md (768px), stacked vertically below
 * that. Keeps Shiki highlighting from the underlying ` ``` ` blocks.
 */
export function Diff(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const blocks: { kind: "before" | "after" | "unknown"; node: ReactNode }[] = [];

  // Walk children once — react-markdown wraps fenced code blocks as
  // <pre><code>…</code></pre>. We keep the rendered <pre> verbatim so
  // Shiki highlighting is preserved.
  const walk = (node: ReactNode): void => {
    if (node == null || node === false) return;
    if (Array.isArray(node)) {
      for (const c of node) walk(c);
      return;
    }
    Children.forEach(node, (c) => {
      if (!isValidElement(c)) return;
      if (c.type === "pre") {
        // Inspect the inner <code> for the meta string (set by remark
        // CodeMeta into data-meta).
        const codeChild = collectCodeChild(c.props);
        const meta = codeChild
          ? asString((codeChild.props as { ["data-meta"]?: string })["data-meta"])
          : "";
        const lower = meta.toLowerCase();
        const kind: "before" | "after" | "unknown" = lower.includes("before")
          ? "before"
          : lower.includes("after")
            ? "after"
            : "unknown";
        blocks.push({ kind, node: c });
        return;
      }
      const sub = (c.props as { children?: ReactNode }).children;
      if (sub !== undefined) walk(sub);
    });
  };
  walk(props.children);

  // Resolve ordering: explicit before/after first, otherwise insertion order.
  let beforeBlock: ReactNode = null;
  let afterBlock: ReactNode = null;
  for (const b of blocks) {
    if (b.kind === "before" && !beforeBlock) beforeBlock = b.node;
    else if (b.kind === "after" && !afterBlock) afterBlock = b.node;
  }
  if (!beforeBlock || !afterBlock) {
    const unknown = blocks.filter((b) => b.kind === "unknown").map((b) => b.node);
    if (!beforeBlock) beforeBlock = unknown.shift() ?? null;
    if (!afterBlock) afterBlock = unknown.shift() ?? null;
  }

  if (!beforeBlock && !afterBlock) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>Diff</strong> — needs two fenced code blocks inside (mark
        them with <code>before</code> / <code>after</code> meta).
      </div>
    );
  }

  return (
    <div className="fv-diff my-6 grid gap-3 md:grid-cols-2">
      <div className="border-rose-500/40 overflow-hidden rounded-lg border-2">
        <div className="border-rose-500/30 text-rose-700 bg-rose-500/10 dark:text-rose-300 border-b px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
          − Before
        </div>
        <div className="fv-diff-pane">{beforeBlock}</div>
      </div>
      <div className="border-emerald-500/40 overflow-hidden rounded-lg border-2">
        <div className="border-emerald-500/30 text-emerald-700 bg-emerald-500/10 dark:text-emerald-300 border-b px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
          + After
        </div>
        <div className="fv-diff-pane">{afterBlock}</div>
      </div>
    </div>
  );
}

function collectCodeChild(
  preProps: unknown
):
  | (import("react").ReactElement<{ ["data-meta"]?: string }>)
  | null {
  const kids = (preProps as { children?: ReactNode })?.children;
  let found: import("react").ReactElement | null = null;
  Children.forEach(kids, (c) => {
    if (found) return;
    if (isValidElement(c) && c.type === "code") {
      found = c as import("react").ReactElement;
    }
  });
  return found as never;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
