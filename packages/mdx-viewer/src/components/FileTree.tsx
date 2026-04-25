import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * FileTree — render a fenced-text file/folder outline using
 * `@pierre/trees` (full-featured tree renderer, vanilla API).
 *
 *     <FileTree>
 *     packages/
 *       mdx-viewer/
 *         src/
 *           components/
 *             Steps.tsx
 *             Cards.tsx
 *           index.ts
 *         package.json
 *     apps/
 *       chrome-ext/
 *         src/
 *     </FileTree>
 *
 * Trailing `/` marks a folder. Indent unit auto-detected from first
 * indented line. Bullet text → flat leaf-paths array → vanilla
 * `new FileTreeModel(opts)` → `model.render({ fileTreeContainer: ref })`.
 *
 * Uses the vanilla API instead of `@pierre/trees/react` to skip the
 * custom-element registration dance and the React-wrapper layer (shadow
 * DOM, web component upgrade, slot composition). Plain `<div>` host +
 * direct `model.render(...)` call. Lazy-loaded so docs without a
 * FileTree don't pay the bundle cost.
 */
export function FileTree(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const text = collectText(props.children).trim();
  const paths = useMemo(() => outlineToPaths(text), [text]);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (paths.length === 0) return;
    if (!hostRef.current) return;
    let cancelled = false;
    let model: { render?: (opts: { fileTreeContainer: HTMLElement }) => void; cleanUp?: () => void; unmount?: () => void } | null = null;

    void Promise.all([
      // Side-effect: registers <file-tree-container>. The vanilla
      // model.render() ALSO uses the custom element internally to host
      // its shadow DOM, so we still need this side-effect import.
      import("@pierre/trees/web-components"),
      import("@pierre/trees"),
    ]).then(
      ([, mod]) => {
        if (cancelled) return;
        try {
          const FileTreeClass = (
            mod as { FileTree: new (opts: unknown) => unknown }
          ).FileTree;
          model = new FileTreeClass({
            paths,
            icons: "standard",
            // FileTreeInitialExpansion = 'closed' | 'open' | number.
            // 'open' expands every folder; pass a number for depth.
            initialExpansion: "open",
            // Don't collapse single-child folder chains into one row —
            // keep the structure the author wrote.
            flattenEmptyDirectories: false,
          }) as typeof model;
          if (hostRef.current && model?.render) {
            model.render({ fileTreeContainer: hostRef.current });
          }
          setLoaded(true);
        } catch (e) {
          setError((e as Error).message);
        }
      },
      (e) => {
        if (!cancelled) setError((e as Error).message);
      }
    );

    return () => {
      cancelled = true;
      try {
        model?.unmount?.();
        model?.cleanUp?.();
      } catch {
        /* swallow */
      }
    };
  }, [paths]);

  if (paths.length === 0) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>FileTree</strong> — empty outline. Add bullet lines like
        <code> src/index.ts</code>; trailing <code>/</code> marks a folder.
      </div>
    );
  }

  if (error) {
    return <FallbackTree text={text} reason={error} />;
  }

  // Pierre's tree uses a virtualized scroller; the inner content has
  // height 0 unless the host has an explicit height. Estimate the
  // visible-row count: every leaf path PLUS the intermediate folders
  // it lives under. We over-count slightly (some folders are shared)
  // which is fine — extra blank space is better than truncation.
  const rowH = 30;
  const folderRows = new Set<string>();
  for (const p of paths) {
    const segs = p.replace(/\/$/, "").split("/");
    let acc = "";
    for (let i = 0; i < segs.length - 1; i++) {
      acc = acc ? `${acc}/${segs[i]}` : segs[i];
      folderRows.add(acc);
    }
  }
  const totalRows = paths.length + folderRows.size;
  const computedHeight = Math.min(800, Math.max(140, totalRows * rowH + 16));

  // Theme pipe — Pierre's tree reads `--trees-*-override` CSS vars off
  // its host element (overrides take precedence over the lib's derived
  // theme tokens). Map shadcn tokens here so the tree tracks light /
  // dark / sepia along with the rest of the doc.
  const themeStyle: React.CSSProperties & Record<string, string> = {
    width: "100%",
    height: `${computedHeight}px`,
    "--trees-bg-override": "var(--card)",
    "--trees-bg-muted-override": "var(--muted)",
    "--trees-fg-override": "var(--foreground)",
    "--trees-fg-muted-override": "var(--muted-foreground)",
    "--trees-accent-override": "var(--primary)",
    "--trees-border-color-override": "var(--border)",
  };

  return (
    <div className="fv-filetree bg-card my-6 rounded-lg border p-2 text-[13px]">
      <div ref={hostRef} style={themeStyle} />
      {!loaded && (
        <div className="text-muted-foreground p-2 text-[11px] italic">
          Loading file tree…
        </div>
      )}
    </div>
  );
}

function FallbackTree({ text, reason }: { text: string; reason: string }) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return (
    <pre className="fv-filetree--fallback bg-muted/30 my-4 overflow-x-auto rounded-md border p-3 text-[12px] leading-snug">
      <code>
        <div className="text-muted-foreground mb-2 text-[11px] italic">
          @pierre/trees failed to load ({reason}); rendering plain outline.
        </div>
        {lines.join("\n")}
      </code>
    </pre>
  );
}

function outlineToPaths(text: string): string[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  let unit = 2;
  for (const l of lines) {
    const m = /^(\s+)/.exec(l);
    if (m && m[1].length > 0) {
      unit = m[1].replace(/\t/g, "  ").length;
      break;
    }
  }

  type Entry = { depth: number; name: string; isFolder: boolean };
  const entries: Entry[] = [];
  for (const raw of lines) {
    const indent = (raw.match(/^\s*/)?.[0] ?? "").replace(/\t/g, "  ").length;
    const depth = unit > 0 ? Math.floor(indent / unit) : 0;
    const name = raw.trim();
    if (!name) continue;
    const isFolder = name.endsWith("/");
    entries.push({
      depth,
      name: isFolder ? name.slice(0, -1) : name,
      isFolder,
    });
  }

  const stack: string[] = [];
  const out: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    while (stack.length > e.depth) stack.pop();
    const parentPath = stack.join("/");
    const fullPath = parentPath ? `${parentPath}/${e.name}` : e.name;
    if (e.isFolder) {
      stack.push(e.name);
      const next = entries[i + 1];
      const isEmpty = !next || next.depth <= e.depth;
      if (isEmpty) out.push(`${fullPath}/`);
    } else {
      out.push(fullPath);
    }
  }
  return out;
}

function collectText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    return collectText(
      (node as { props: { children?: ReactNode } }).props.children
    );
  }
  return "";
}
