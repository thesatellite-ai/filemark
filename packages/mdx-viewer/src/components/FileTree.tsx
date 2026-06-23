import { useMemo, useState, type ReactNode } from "react";

// Inline SVG icons (no lucide-react dependency — this package renders with
// hand-rolled SVGs; see Roadmap/Backlinks/ReadingTime). 16px, currentColor.
function ChevronIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      {open ? <path d="m6 9 6 6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}
function FolderIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {open ? (
        <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
      ) : (
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      )}
    </svg>
  );
}
function FileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

/**
 * FileTree — render an indented file/folder outline as a collapsible tree.
 *
 *   ```filetree
 *   packages/
 *     mdx-viewer/
 *       src/
 *         components/
 *           Steps.tsx
 *         index.ts            (barrel)
 *       package.json
 *   ```
 *
 * Trailing `/` marks a folder; a line with deeper-indented children is also a
 * folder. Indent unit is auto-detected from the first indented line. Text after
 * 2+ spaces on a line is treated as a muted annotation (e.g. "(barrel)").
 *
 * INPUT — two forms:
 *   • fenced ` ```filetree ` → `source` (PREFERRED). A code fence is one atomic
 *     CommonMark block, so blank lines inside the outline are safe.
 *   • `<FileTree>…</FileTree>` → `children`. Convenient but fragile: a blank line
 *     inside the block ends the HTML block early (CommonMark), the lone
 *     `</FileTree>` orphans, and parse5 nests the REST OF THE DOC into the
 *     component. Prefer the fence; if you use the tag, keep it blank-line-free.
 *
 * RENDERING — a dependency-free native tree (plain React + Tailwind), NOT a web
 * component. Deliberately so: a custom-element/shadow-DOM tree (the previous
 * `@pierre/trees` impl) throws `customElements` is null in the injected
 * content-script viewer and can't render there. A native tree renders
 * identically in the standalone app, the injected file:// viewer, and any
 * MV3 / no-eval context.
 */
export function FileTree(
  props: Record<string, unknown> & { children?: ReactNode; source?: string },
) {
  // Fenced form passes raw `source`; HTML-tag form passes `children`.
  const text = (
    typeof props.source === "string" ? props.source : collectText(props.children)
  ).trim();
  const roots = useMemo(() => parseOutline(text), [text]);

  if (roots.length === 0) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>FileTree</strong> — empty outline. Add lines like
        <code> src/index.ts</code>; a trailing <code>/</code> marks a folder.
      </div>
    );
  }

  return (
    <div className="fv-filetree bg-card my-6 overflow-x-auto rounded-lg border p-2 text-[13px] leading-relaxed">
      {roots.map((node, i) => (
        <TreeRow key={i} node={node} depth={0} />
      ))}
    </div>
  );
}

/** One node + its (lazily-collapsible) subtree. Folders default to expanded. */
function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const hasChildren = node.children.length > 0;
  const isFolder = node.isFolder || hasChildren;
  const [open, setOpen] = useState(true);

  return (
    <div>
      <div
        className="hover:bg-muted/50 flex items-center gap-1.5 rounded px-1 py-0.5"
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Collapse" : "Expand"}
            className="text-muted-foreground hover:text-foreground inline-flex size-4 shrink-0 items-center justify-center"
          >
            <ChevronIcon open={open} className="size-3.5" />
          </button>
        ) : (
          // Spacer so leaf rows align with rows that have a chevron.
          <span className="inline-block size-4 shrink-0" aria-hidden />
        )}
        {isFolder ? (
          <FolderIcon open={open && hasChildren} className="text-primary size-4 shrink-0" />
        ) : (
          <FileIcon className="text-muted-foreground size-4 shrink-0" />
        )}
        <span className={isFolder ? "font-medium" : ""}>{node.name}</span>
        {node.annotation && (
          <span className="text-muted-foreground/80 ml-1 text-[11px]">{node.annotation}</span>
        )}
      </div>
      {hasChildren && open && (
        <div>
          {node.children.map((child, i) => (
            <TreeRow key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface TreeNode {
  name: string;
  /** Muted suffix after 2+ spaces, e.g. "(was wbh/schema/app_install.go)". */
  annotation: string;
  isFolder: boolean;
  children: TreeNode[];
}

/**
 * Parse an indented outline into a nested tree. Depth is derived from leading
 * whitespace divided by the auto-detected indent unit; nesting is resolved with
 * a depth-indexed stack. A node is a folder if its name ends with `/` OR it has
 * children. Annotation = text after the first run of 2+ spaces.
 */
function parseOutline(text: string): TreeNode[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Indent unit = leading whitespace width of the first indented line.
  let unit = 2;
  for (const l of lines) {
    const m = /^(\s+)/.exec(l);
    if (m && m[1].length > 0) {
      unit = m[1].replace(/\t/g, "  ").length;
      break;
    }
  }

  const roots: TreeNode[] = [];
  const stack: TreeNode[] = []; // stack[d] = the open node at depth d
  for (const raw of lines) {
    const indent = (raw.match(/^\s*/)?.[0] ?? "").replace(/\t/g, "  ").length;
    const depth = unit > 0 ? Math.floor(indent / unit) : 0;
    const content = raw.trim();

    // Split "name<2+ spaces>annotation".
    const splitAt = content.search(/\s{2,}/);
    let name = content;
    let annotation = "";
    if (splitAt >= 0) {
      name = content.slice(0, splitAt).trim();
      annotation = content.slice(splitAt).trim();
    }
    const endsWithSlash = name.endsWith("/");
    if (endsWithSlash) name = name.slice(0, -1);

    const node: TreeNode = { name, annotation, isFolder: endsWithSlash, children: [] };

    // Attach to the nearest shallower ancestor; clamp to available depth so a
    // jump in indentation never loses the node.
    const parentDepth = Math.min(depth, stack.length) - 1;
    if (parentDepth < 0) {
      roots.push(node);
    } else {
      const parent = stack[parentDepth]!;
      parent.children.push(node);
      parent.isFolder = true;
    }
    stack.length = parentDepth + 1;
    stack.push(node);
  }
  return roots;
}

/** Recursively flatten a ReactNode subtree to its text — for the `<FileTree>`
 *  HTML-tag form, where the outline arrives as rendered children. */
function collectText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    return collectText((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}
