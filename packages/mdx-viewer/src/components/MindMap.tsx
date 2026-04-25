import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

interface Node {
  text: ReactNode;
  children: Node[];
}

interface MarkmapInstance {
  fit?: () => void;
  rescale?: (factor: number) => void;
  destroy?: () => void;
}

/**
 * MindMap — markdown bullet outline → real mindmap (markmap engine).
 *
 * Two source modes:
 *   1. Fenced ```mindmap block (preferred) — MDXViewer's `lang === "mindmap"`
 *      handler passes the raw text via `source=`. Robust against the
 *      CommonMark HTML-block-edge gotcha (see MINDMAP_ADR.md).
 *   2. <MindMap><ul>...</ul></MindMap> wrapping a markdown list. Best-
 *      effort; falls back to an inline tree if no list is found.
 *
 * Renders via `markmap-lib` + `markmap-view` (lazy-loaded so the heavy
 * d3 dependency only lands when a doc actually has a mindmap). Falls
 * back to a CSS collapsible tree if markmap fails to load (CSP / network
 * issues).
 *
 * Theming: pipes shadcn tokens into markmap's color callback so the map
 * tracks the active theme (light / dark / sepia) without flicker.
 */
export function MindMap(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const sourceText = asString(props.source);
  // Prefer markmap when we have raw source text. For the children path
  // we synthesize markdown by walking the parsed React tree → bullets.
  const markdownSource =
    sourceText || treeToMarkdown(extractTree(props.children));
  const title = asString(props.title);
  const heightAttr = asString(props.height);
  const height =
    heightAttr && /^\d+(?:\.\d+)?(?:px|em|vh|%)?$/.test(heightAttr)
      ? heightAttr.match(/^\d+$/)
        ? `${heightAttr}px`
        : heightAttr
      : "420px";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Live ref to the active markmap instance — used by the toolbar
  // buttons to call mm.fit() / mm.rescale() between renders.
  const mmRef = useRef<MarkmapInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!markdownSource.trim()) return;
    if (!svgRef.current) return;

    let cancelled = false;
    setError(null);
    setLoaded(false);

    (async () => {
      try {
        // Pre-publish KaTeX globally so markmap's bundled @vscode/
        // markdown-it-katex finds it under MV3 strict CSP (no CDN
        // loads possible). Our chrome-ext already imports katex.min.css
        // via main.tsx, so the visual styles are present too.
        if (typeof window !== "undefined" && !(window as { katex?: unknown }).katex) {
          try {
            const katexMod = await import("katex");
            (window as Record<string, unknown>).katex =
              (katexMod as { default?: unknown }).default ?? katexMod;
          } catch {
            /* katex unavailable — math falls back to raw text */
          }
        }

        const [libMod, viewMod] = await Promise.all([
          import("markmap-lib"),
          import("markmap-view"),
        ]);
        if (cancelled) return;

        const transformer = new libMod.Transformer();
        const transformed = transformer.transform(markdownSource);
        const { root } = transformed;
        // Frontmatter `markmap:` block carries author-controlled
        // options — colorFreezeLevel, color, maxWidth, initialExpandLevel,
        // duration, etc. deriveOptions converts the frontmatter shape
        // (e.g. `color: "#2980b9"` as a single value) into the runtime
        // option shape Markmap.create expects.
        const fmOptions =
          (
            transformed as {
              frontmatter?: { markmap?: Record<string, unknown> };
            }
          ).frontmatter?.markmap ?? {};
        const derivedOptions = (
          viewMod as {
            deriveOptions?: (o: Record<string, unknown>) => Record<string, unknown>;
          }
        ).deriveOptions
          ? (viewMod as unknown as {
              deriveOptions: (o: Record<string, unknown>) => Record<string, unknown>;
            }).deriveOptions(fmOptions)
          : fmOptions;

        const svg = svgRef.current;
        if (!svg) return;
        while (svg.firstChild) svg.removeChild(svg.firstChild);

        // Merge author frontmatter on top of our base defaults. The
        // base override (`scrollForPan: false`) is still applied unless
        // the author explicitly opts back in via frontmatter.
        const created = viewMod.Markmap.create(
          svg,
          { scrollForPan: false, ...derivedOptions },
          root
        );
        if (cancelled) {
          (created as MarkmapInstance | null)?.destroy?.();
          return;
        }
        mmRef.current = created as MarkmapInstance;
        setLoaded(true);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message ?? "markmap failed to load");
      }
    })();

    return () => {
      cancelled = true;
      mmRef.current?.destroy?.();
      mmRef.current = null;
    };
  }, [markdownSource]);

  // Fullscreen API — listen for browser-level fullscreen changes (Esc
  // key, OS-level exit, etc.) and keep our state in sync. Also re-fit
  // the markmap after the size flip so the diagram doesn't end up
  // off-canvas with a stale transform when entering or exiting.
  useEffect(() => {
    const onChange = () => {
      const isFs = document.fullscreenElement === containerRef.current;
      setFullscreen(isFs);
      // The CSS transition + browser fullscreen flip take a frame to
      // settle. Re-fit on the next animation frame so markmap measures
      // the post-flip SVG size, not the in-between size.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => mmRef.current?.fit?.());
      });
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const zoomIn = () => mmRef.current?.rescale?.(1.25);
  const zoomOut = () => mmRef.current?.rescale?.(0.8);
  const fitView = () => mmRef.current?.fit?.();
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      void document.exitFullscreen?.();
    } else {
      void el.requestFullscreen?.();
    }
  };

  // Keyboard zoom — fires only when the mindmap container has focus,
  // so it doesn't hijack typing in the rest of the page. Tab-stop on
  // the figure (tabIndex={0}) lets the user focus by clicking or
  // tabbing in. Esc handled separately to also exit fullscreen.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) {
      // Don't fire when keys come from a child (e.g. a focused button
      // inside the toolbar) — already-bound element handlers win.
      // Container is the only legitimate source.
      const path = e.nativeEvent.composedPath();
      if (!path.includes(e.currentTarget)) return;
    }
    switch (e.key) {
      case "+":
      case "=":
        e.preventDefault();
        zoomIn();
        break;
      case "-":
      case "_":
        e.preventDefault();
        zoomOut();
        break;
      case "0":
        e.preventDefault();
        fitView();
        break;
      case "f":
      case "F":
        e.preventDefault();
        toggleFullscreen();
        break;
    }
  };

  if (!markdownSource.trim()) {
    return (
      <div className="bg-muted/20 my-6 rounded-lg border p-4 text-sm">
        <strong>MindMap</strong> — needs a nested unordered list inside, or
        use a <code>```mindmap</code> fenced block.
      </div>
    );
  }

  // Error path → CSS tree fallback so authors still see something useful.
  if (error) {
    const tree = sourceText
      ? parseBulletText(sourceText)
      : extractTree(props.children);
    return <CssTreeFallback title={title} tree={tree} reason={error} />;
  }

  return (
    <figure
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={[
        "fv-mindmap focus-visible:outline-primary bg-muted/15 my-6 overflow-hidden rounded-lg border focus-visible:outline-2",
        fullscreen ? "fv-mindmap--fs" : "",
      ].join(" ")}
    >
      {title && (
        <figcaption className="text-muted-foreground border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wide">
          {title}
        </figcaption>
      )}
      <div
        className="relative"
        style={{ height: fullscreen ? "100vh" : height }}
      >
        <svg
          ref={svgRef}
          className="block h-full w-full cursor-grab active:cursor-grabbing"
          aria-label={title || "MindMap"}
        />
        {!loaded && (
          <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-xs italic">
            Rendering mindmap…
          </div>
        )}
        {loaded && (
          <div className="bg-card/85 absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-md border p-0.5 shadow-sm backdrop-blur-sm">
            <ToolbarBtn onClick={zoomIn} title="Zoom in (+)" label="+" />
            <ToolbarBtn onClick={zoomOut} title="Zoom out (−)" label="−" />
            <ToolbarBtn onClick={fitView} title="Fit to view (0)" label="⤢" />
            <ToolbarBtn
              onClick={toggleFullscreen}
              title={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
              label={fullscreen ? "✕" : "⛶"}
            />
          </div>
        )}
      </div>
    </figure>
  );
}

function ToolbarBtn({
  onClick,
  title,
  label,
}: {
  onClick: () => void;
  title: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="text-muted-foreground hover:text-foreground hover:bg-muted/60 flex size-7 items-center justify-center rounded text-sm font-medium transition-colors"
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Theme palette — read shadcn-token CSS vars off the document root so
// the mindmap's branch colours track light / dark / sepia.
// ─────────────────────────────────────────────────────────────────────────

function readThemePalette(): string[] {
  if (typeof window === "undefined") return DEFAULT_PALETTE;
  try {
    const cs = window.getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) => {
      const raw = cs.getPropertyValue(name).trim();
      return raw ? `oklch(${raw})` : fallback;
    };
    return [
      v("--primary", "#6366f1"),
      v("--chart-1", "#3b82f6"),
      v("--chart-2", "#10b981"),
      v("--chart-3", "#f59e0b"),
      v("--chart-4", "#ef4444"),
      v("--chart-5", "#8b5cf6"),
    ];
  } catch {
    return DEFAULT_PALETTE;
  }
}

const DEFAULT_PALETTE = [
  "#6366f1", // indigo
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // rose
  "#8b5cf6", // violet
];

// ─────────────────────────────────────────────────────────────────────────
// CSS tree fallback — only rendered when markmap fails to load.
// ─────────────────────────────────────────────────────────────────────────

function CssTreeFallback({
  title,
  tree,
  reason,
}: {
  title: string;
  tree: Node[];
  reason: string;
}) {
  return (
    <div className="fv-mindmap fv-mindmap--fallback bg-muted/20 my-6 overflow-x-auto rounded-lg border p-4">
      {title && (
        <div className="text-muted-foreground mb-1 text-[11px] font-semibold uppercase tracking-wide">
          {title}
        </div>
      )}
      <div className="text-muted-foreground mb-3 text-[11px] italic">
        Markmap failed to load ({reason}); rendering as a fallback tree.
      </div>
      {tree.length > 0 ? (
        <ul className="m-0 flex list-none items-start gap-4 p-0">
          {tree.map((n, i) => (
            <FallbackNode key={i} node={n} depth={0} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm italic">
          (no list content found)
        </p>
      )}
    </div>
  );
}

function FallbackNode({ node, depth }: { node: Node; depth: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const tones = [
    "border-primary/40 bg-primary/5",
    "border-blue-500/40 bg-blue-500/5",
    "border-emerald-500/40 bg-emerald-500/5",
    "border-amber-500/40 bg-amber-500/5",
    "border-rose-500/40 bg-rose-500/5",
    "border-violet-500/40 bg-violet-500/5",
  ];
  const tone = tones[depth % tones.length];
  return (
    <li className="m-0 flex list-none flex-col items-start gap-2 p-0">
      <button
        type="button"
        onClick={() => hasChildren && setOpen(!open)}
        className={[
          "bg-card hover:bg-muted/60 flex max-w-[220px] items-center gap-1.5 rounded-md border-2 px-3 py-1.5 text-left text-[13px] leading-tight font-medium",
          tone,
        ].join(" ")}
      >
        <span className="min-w-0">{node.text}</span>
      </button>
      {hasChildren && open && (
        <ul className="m-0 ml-4 flex flex-col gap-1.5 border-l-2 border-dashed border-current pl-3 list-none p-0 opacity-90">
          {node.children.map((c, i) => (
            <FallbackNode key={i} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Children → tree extraction (legacy <MindMap><ul>…</ul></MindMap> path).
// ─────────────────────────────────────────────────────────────────────────

function extractTree(children: ReactNode): Node[] {
  const ul = findFirstByType(children, "ul");
  if (!ul) return [];
  return liChildrenToNodes(ul.props.children);
}

function liChildrenToNodes(ulChildren: ReactNode): Node[] {
  const out: Node[] = [];
  Children.forEach(ulChildren, (child) => {
    if (!isValidElement(child)) return;
    if (child.type !== "li") return;
    const liKids = (child.props as { children?: ReactNode }).children;
    const text: ReactNode[] = [];
    let nested: Node[] = [];
    Children.forEach(liKids, (k) => {
      if (isValidElement(k) && k.type === "ul") {
        nested = liChildrenToNodes((k.props as { children?: ReactNode }).children);
      } else if (isValidElement(k) && k.type === "p") {
        const pKids = (k.props as { children?: ReactNode }).children;
        Children.forEach(pKids, (pk) => text.push(pk));
      } else {
        text.push(k);
      }
    });
    out.push({ text: <>{text}</>, children: nested });
  });
  return out;
}

function findFirstByType(
  children: ReactNode,
  type: string
): ReactElement<{ children?: ReactNode }> | null {
  let found: ReactElement<{ children?: ReactNode }> | null = null;
  const walk = (node: ReactNode): void => {
    if (found) return;
    if (node == null || node === false) return;
    if (Array.isArray(node)) {
      for (const c of node) {
        if (found) return;
        walk(c);
      }
      return;
    }
    Children.forEach(node, (c) => {
      if (found) return;
      if (!isValidElement(c)) return;
      if (c.type === type) {
        found = c as ReactElement<{ children?: ReactNode }>;
        return;
      }
      const sub = (c.props as { children?: ReactNode }).children;
      if (sub !== undefined) walk(sub);
    });
  };
  walk(children);
  return found;
}

// ─────────────────────────────────────────────────────────────────────────
// Children-tree → markdown bullet text. Used to feed markmap when the
// author wrote the legacy <MindMap><ul>…</ul></MindMap> form.
// ─────────────────────────────────────────────────────────────────────────

function treeToMarkdown(tree: Node[]): string {
  if (tree.length === 0) return "";
  const lines: string[] = [];
  const walk = (nodes: Node[], depth: number) => {
    for (const n of nodes) {
      lines.push(`${"  ".repeat(depth)}- ${reactToText(n.text)}`);
      walk(n.children, depth + 1);
    }
  };
  walk(tree, 0);
  return lines.join("\n");
}

function reactToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(reactToText).join("");
  if (isValidElement(node)) {
    return reactToText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

// ─────────────────────────────────────────────────────────────────────────
// Bullet-text parser (used for the fenced ```mindmap path AND inside the
// fallback when markmap is unavailable).
// ─────────────────────────────────────────────────────────────────────────

function parseBulletText(src: string): Node[] {
  const lines = src.split(/\r?\n/);
  const root: Node[] = [];
  const stack: { indent: number; children: Node[] }[] = [
    { indent: -1, children: root },
  ];
  for (const raw of lines) {
    const m = /^(\s*)([-*+])\s+(.*)$/.exec(raw);
    if (!m) continue;
    const indent = m[1].replace(/\t/g, "  ").length;
    const text = m[3].trim();
    if (!text) continue;
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const node: Node = { text, children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push({ indent, children: node.children });
  }
  return root;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
