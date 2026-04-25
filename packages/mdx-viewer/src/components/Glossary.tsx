import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Define — single-doc glossary entry.
 *
 *     <Define term="filemark">A reader-first markdown renderer for
 *     Chrome that treats every doc as part of a library.</Define>
 *
 * Renders the definition inline AS-IS (so it's still a normal
 * paragraph). After mount, scans the article body for occurrences of
 * the term and wraps them with `<abbr title="…">` so a hover popover
 * surfaces the definition every time the term appears later in the
 * doc.
 *
 * Single-doc only. Cross-doc glossary index is a future addition
 * (would mirror `useLinkIndex`).
 *
 * Term matching: case-insensitive, word-boundary, whole word only.
 * Skips occurrences inside code / pre / abbr / link / heading text.
 */
export function Define(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const term = asString(props.term);
  const ref = useRef<HTMLSpanElement | null>(null);

  // Build the definition text for the popover. Walk children → plain text.
  const defText = collectText(props.children);

  useEffect(() => {
    if (!term || !defText) return;
    const root = ref.current?.closest(".fv-mdx-body") as HTMLElement | null;
    if (!root) return;
    const re = new RegExp(`\\b(${escapeRegex(term)})\\b`, "gi");
    decorateOccurrences(root, re, defText, term);
    // No cleanup needed — a re-render of the doc rebuilds .fv-mdx-body.
  }, [term, defText]);

  return (
    <span ref={ref} className="fv-define">
      <strong>{term}</strong>
      {": "}
      {props.children}
    </span>
  );
}

function decorateOccurrences(
  root: HTMLElement,
  re: RegExp,
  defText: string,
  term: string
): void {
  const SKIP_TAGS = new Set([
    "CODE",
    "PRE",
    "ABBR",
    "A",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "SCRIPT",
    "STYLE",
  ]);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let p: Node | null = node.parentNode;
      while (p && p instanceof HTMLElement) {
        if (SKIP_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.classList?.contains("fv-define")) return NodeFilter.FILTER_REJECT;
        p = p.parentNode;
      }
      return re.test(node.textContent ?? "")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  const targets: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) targets.push(n as Text);
  for (const t of targets) {
    const txt = t.textContent ?? "";
    re.lastIndex = 0;
    const out = document.createDocumentFragment();
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(txt)) !== null) {
      if (m.index > last) {
        out.appendChild(document.createTextNode(txt.slice(last, m.index)));
      }
      const ab = document.createElement("abbr");
      ab.title = `${term} — ${defText}`;
      ab.textContent = m[1];
      ab.style.borderBottom = "1px dotted currentColor";
      ab.style.cursor = "help";
      out.appendChild(ab);
      last = m.index + m[1].length;
    }
    if (last < txt.length) {
      out.appendChild(document.createTextNode(txt.slice(last)));
    }
    t.parentNode?.replaceChild(out, t);
  }
}

function collectText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (isValidElement(node)) {
    return collectText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

// Re-export the Children import to silence unused warnings (we use
// it transitively via collectText/isValidElement).
export const __glossary_internal = { Children };
