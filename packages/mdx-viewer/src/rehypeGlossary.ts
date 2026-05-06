/**
 * rehype plugin — wraps every word-boundary occurrence of a glossary term
 * in <abbr title="…"> at hast-build time, so React owns the resulting tree.
 *
 * The earlier post-mount DOM walker mutated text nodes that React already
 * reconciled, which raced subsequent renders → "Failed to execute
 * 'insertBefore' on 'Node'". Building the abbr nodes in hast eliminates the
 * race entirely.
 */

type HastText = { type: "text"; value: string };
type HastElement = {
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children: HastChild[];
};
type HastChild = HastText | HastElement | { type: string; [k: string]: unknown };
type HastRoot = { type: "root"; children: HastChild[] };

const SKIP_TAGS = new Set([
  "code",
  "pre",
  "abbr",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "script",
  "style",
  "define",
]);

export interface RehypeGlossaryOptions {
  terms: Map<string, string>;
}

export function rehypeGlossary(options?: RehypeGlossaryOptions) {
  const terms = options?.terms;
  return (tree: HastRoot) => {
    if (!terms || terms.size === 0) return;
    const keys = [...terms.keys()].sort((a, b) => b.length - a.length);
    if (keys.length === 0) return;
    const re = new RegExp(`\\b(${keys.map(escapeRegex).join("|")})\\b`, "gi");
    const defs = new Map<string, string>();
    for (const [k, v] of terms) defs.set(k.toLowerCase(), v);
    walk(tree.children, false, re, defs);
  };
}

function walk(
  children: HastChild[],
  skip: boolean,
  re: RegExp,
  defs: Map<string, string>
): void {
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!child || typeof child !== "object") continue;
    if (child.type === "element") {
      const el = child as HastElement;
      const inSkip = skip || isSkipElement(el);
      if (Array.isArray(el.children)) {
        walk(el.children, inSkip, re, defs);
      }
    } else if (child.type === "text" && !skip) {
      const replaced = decorate((child as HastText).value, re, defs);
      if (replaced) {
        children.splice(i, 1, ...replaced);
        i += replaced.length - 1;
      }
    }
  }
}

function isSkipElement(el: HastElement): boolean {
  const tag = el.tagName?.toLowerCase();
  if (!tag) return false;
  if (SKIP_TAGS.has(tag)) return true;
  const cls = el.properties?.className;
  if (Array.isArray(cls)) {
    for (const c of cls) {
      const s = String(c);
      if (s === "fv-define") return true;
      if (s.startsWith("katex")) return true;
    }
  }
  return false;
}

function decorate(
  text: string,
  re: RegExp,
  defs: Map<string, string>
): HastChild[] | null {
  re.lastIndex = 0;
  if (!re.test(text)) return null;
  re.lastIndex = 0;
  const out: HastChild[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ type: "text", value: text.slice(last, m.index) });
    }
    const def = defs.get(m[1].toLowerCase()) ?? "";
    out.push({
      type: "element",
      tagName: "abbr",
      properties: {
        title: def,
        style: "border-bottom: 1px dotted currentColor; cursor: help;",
      },
      children: [{ type: "text", value: m[1] }],
    });
    last = m.index + m[1].length;
  }
  if (last < text.length) {
    out.push({ type: "text", value: text.slice(last) });
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DEFINE_RE =
  /<Define\s+term=(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/Define>/gi;

export function extractGlossaryTerms(source: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!source) return map;
  DEFINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DEFINE_RE.exec(source)) !== null) {
    const term = (m[1] || m[2] || "").trim();
    const def = stripInlineMd((m[3] || "").trim());
    if (term && def && !map.has(term)) map.set(term, def);
  }
  return map;
}

function stripInlineMd(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
