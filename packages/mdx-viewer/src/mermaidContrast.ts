// Per-node label contrast for mermaid diagrams.
//
// Why this exists
// ---------------
// Mermaid's `dark` theme forces every node label to a *light* text color. That
// is correct for the theme's own dark default node fills, but it collides with
// author-supplied light fills — `style X fill:#e8f5e9` or a `classDef` — which
// stay light in dark mode. Light text on a light fill = the washed-out,
// unreadable nodes reported in dark mode (Chrome AND VS Code). The mirror bug
// exists in light mode: an author dark fill keeps mermaid's dark default label
// text → dark-on-dark.
//
// There is no single global label color that reads on both mermaid's theme
// default fills and arbitrary author fills, so the fix has to be per node:
// after mermaid renders, look at each node's *actual resolved fill* and repaint
// only that node's label to whichever token (dark or light) contrasts with it.
// Nodes without an explicit author fill are left untouched so the mermaid theme
// keeps full control of the default look in each mode.
//
// This module is split into a pure core (color parsing + WCAG luminance +
// token choice — unit-tested in the node env) and a thin DOM shell
// (`recolorMermaidLabels`) that walks the rendered SVG string. The shell is a
// no-op (returns the input untouched) anywhere `DOMParser`/`XMLSerializer` are
// unavailable, so it is safe to call during SSR or in a non-DOM host.

/** An RGB triple in the 0–255 range. Alpha is intentionally dropped — label
 *  contrast is decided against the node's opaque fill; a translucent fill over
 *  the diagram background is a rare enough case that treating it as opaque is
 *  an acceptable, always-legible approximation. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Dark label token — near-slate-900. Applied when a node's fill is light.
 *  A hair off pure black so it reads as "ink" rather than a harsh #000. */
export const LABEL_DARK = "#111827";

/** Light label token — near-gray-50. Applied when a node's fill is dark. */
export const LABEL_LIGHT = "#f9fafb";

/** Relative-luminance split point (WCAG scale, 0 = black … 1 = white). A fill
 *  at or above this is treated as "light" and gets the dark label; below it
 *  gets the light label. 0.5 is the neutral midpoint — deliberately not tuned
 *  per-palette so behavior is predictable and explainable from the constant. */
export const LUMINANCE_MIDPOINT = 0.5;

/** CSS keyword fills that carry no color and must never be recolored against
 *  (they mean "inherit the theme default"), so a node using them is skipped. */
const NON_COLOR_FILLS = new Set(["none", "transparent", "inherit", "currentcolor"]);

/** The handful of CSS named colors mermaid/authors realistically emit for
 *  fills. Kept tiny on purpose: an unknown name returns null → that node is
 *  skipped (safe no-op) rather than guessed at. Extend only when a real
 *  diagram needs it. */
const NAMED_COLORS: Readonly<Record<string, Rgb>> = {
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 128, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  gray: { r: 128, g: 128, b: 128 },
  grey: { r: 128, g: 128, b: 128 },
  silver: { r: 192, g: 192, b: 192 },
};

/**
 * Parse a CSS color string into an {@link Rgb}, or null if it is not a color we
 * can reason about (unknown keyword, `none`, a gradient, etc.).
 *
 * Supported: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb(...)`, `rgba(...)`
 * (integer or percentage channels), and the small {@link NAMED_COLORS} set.
 * Alpha is parsed-and-discarded. Returning null is the safe path — the caller
 * skips recoloring that node rather than risk a wrong guess.
 */
export function parseColor(input: string | null | undefined): Rgb | null {
  if (!input) return null;
  const value = input.trim().toLowerCase();
  if (value === "" || NON_COLOR_FILLS.has(value)) return null;

  if (value.startsWith("#")) return parseHex(value);
  if (value.startsWith("rgb")) return parseRgbFunc(value);
  return NAMED_COLORS[value] ?? null;
}

/** Parse `#rgb` / `#rgba` / `#rrggbb` / `#rrggbbaa`. Alpha ignored. */
function parseHex(value: string): Rgb | null {
  const hex = value.slice(1);
  const expand = (c: string) => Number.parseInt(c + c, 16);
  if (hex.length === 3 || hex.length === 4) {
    const r = expand(hex[0]);
    const g = expand(hex[1]);
    const b = expand(hex[2]);
    return anyNaN(r, g, b) ? null : { r, g, b };
  }
  if (hex.length === 6 || hex.length === 8) {
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return anyNaN(r, g, b) ? null : { r, g, b };
  }
  return null;
}

/** Parse `rgb(...)` / `rgba(...)` with integer or `%` channels. Alpha ignored. */
function parseRgbFunc(value: string): Rgb | null {
  const open = value.indexOf("(");
  const close = value.indexOf(")");
  if (open === -1 || close === -1 || close < open) return null;
  // Split on commas or whitespace (CSS Color 4 allows `rgb(0 128 255)`), then
  // drop an optional slash-separated alpha (`rgb(0 128 255 / 50%)`).
  const parts = value
    .slice(open + 1, close)
    .split("/")[0]
    .split(/[\s,]+/)
    .filter((p) => p !== "");
  if (parts.length < 3) return null;
  const channel = (p: string): number => {
    if (p.endsWith("%")) {
      const pct = Number.parseFloat(p.slice(0, -1));
      return Number.isNaN(pct) ? Number.NaN : Math.round((pct / 100) * 255);
    }
    return Number.parseInt(p, 10);
  };
  const r = channel(parts[0]);
  const g = channel(parts[1]);
  const b = channel(parts[2]);
  return anyNaN(r, g, b) ? null : { r: clamp255(r), g: clamp255(g), b: clamp255(b) };
}

function anyNaN(...ns: number[]): boolean {
  return ns.some((n) => Number.isNaN(n));
}
function clamp255(n: number): number {
  return Math.min(255, Math.max(0, n));
}

/**
 * WCAG relative luminance of an {@link Rgb}, in [0, 1].
 * (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance) — used because it
 * matches perceived lightness far better than a naive channel average, so the
 * dark/light label choice is correct for e.g. a saturated blue vs a pale yellow
 * that share the same average.
 */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Choose the readable label token for a given fill string, or null if the fill
 * is not a color we recolor against (caller then leaves the node alone).
 * Light fill → {@link LABEL_DARK}; dark fill → {@link LABEL_LIGHT}.
 */
export function readableLabelColor(fill: string | null | undefined): string | null {
  const rgb = parseColor(fill);
  if (!rgb) return null;
  return relativeLuminance(rgb) >= LUMINANCE_MIDPOINT ? LABEL_DARK : LABEL_LIGHT;
}

// ── Dark-mode fill deepening ────────────────────────────────────────────────
// An author fill like `#e8f5e9` is a near-white pastel tuned for a WHITE page.
// On a dark canvas it reads as "washed white", so the green/amber/red semantics
// are lost even once the label text is legible. Mermaid's own dark theme uses
// deep, saturated node fills with light text — we do the same to author fills:
// keep the hue exactly, floor the saturation so the hue is unmistakable, and
// drop the lightness into a deep band. Result: pale green → forest green, pale
// amber → deep amber, pale pink → dark red — each still paired with its
// (already-saturated) author stroke as a border, and a light label on top.

/** Target lightness for a deepened dark-mode fill (HSL L, 0–1). Low enough to
 *  read as a real color block on black, high enough to keep the hue alive. */
export const DARK_FILL_TARGET_L = 0.24;

/** Saturation floor for a deepened dark-mode fill (HSL S, 0–1). Pastels are
 *  low-saturation; without a floor a deepened pastel turns muddy gray. */
export const DARK_FILL_MIN_SAT = 0.5;

/** An HSL triple: hue in [0,360), saturation + lightness in [0,1]. */
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** Convert {@link Rgb} → {@link Hsl}. Standard formula; hue is 0 for grays. */
export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

/** Convert {@link Hsl} → {@link Rgb} (channels rounded to 0–255). */
export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** Serialize {@link Rgb} → `#rrggbb`. */
export function toHex({ r, g, b }: Rgb): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Deepen a light pastel fill into a dark-mode-appropriate version of the SAME
 * hue — hue preserved exactly, saturation floored at {@link DARK_FILL_MIN_SAT},
 * lightness pinned to {@link DARK_FILL_TARGET_L}. A true gray (S≈0) stays gray
 * (nothing to saturate). Returns a `#rrggbb` string.
 */
export function deepenFillForDark(rgb: Rgb): string {
  const hsl = rgbToHsl(rgb);
  if (hsl.s === 0) return toHex(hslToRgb({ h: 0, s: 0, l: DARK_FILL_TARGET_L }));
  return toHex(
    hslToRgb({ h: hsl.h, s: Math.max(hsl.s, DARK_FILL_MIN_SAT), l: DARK_FILL_TARGET_L }),
  );
}

/**
 * Pull a `fill:` value out of an inline CSS `style` string, or null if absent.
 * Mermaid applies an author `style N fill:#…` directive as an inline style on
 * the node's shape element, so this is the primary fill source.
 */
export function fillFromStyle(style: string | null | undefined): string | null {
  if (!style) return null;
  // Match `fill: <value>` up to the next `;` or end. `!important` is stripped.
  const m = style.match(/(?:^|;)\s*fill\s*:\s*([^;]+)/i);
  if (!m) return null;
  return m[1].replace(/!important/i, "").trim() || null;
}

/**
 * Parse a mermaid SVG `<style>` block into a `className → fill` map for
 * `classDef`-styled nodes. Mermaid emits `classDef` fills as CSS rules like
 * `.myClass > * { fill: #e8f5e9 !important; }` (and sometimes `.myClass { … }`),
 * so the inline-style path misses them — this recovers them.
 *
 * Returns an empty map when there is no usable rule; only the first fill seen
 * for a class wins (mermaid emits one authoritative rule per class).
 */
export function classFillsFromStyleBlock(css: string | null | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!css) return out;
  // Each rule: `<selector> { <decls> }`. We only care about single-class
  // selectors (optionally `> *`) carrying a `fill:` — that is the exact shape
  // mermaid generates for classDef, and it avoids misreading unrelated rules.
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let rule: RegExpExecArray | null;
  while ((rule = ruleRe.exec(css)) !== null) {
    const selector = rule[1].trim();
    const decls = rule[2];
    const fill = fillFromStyle(decls);
    if (!fill) continue;
    // Accept `.name` or `.name > *` (mermaid's classDef shape). Reject compound
    // or descendant selectors that could belong to something other than a node.
    const sel = selector.match(/^\.([A-Za-z0-9_-]+)(?:\s*>\s*\*)?$/);
    if (!sel) continue;
    const className = sel[1];
    if (!out.has(className)) out.set(className, fill);
  }
  return out;
}

/** Shape elements whose fill defines a node's background, in priority order. */
const NODE_SHAPE_SELECTOR = "rect, polygon, ellipse, circle, path";

/** Label elements inside a node group. Covers both HTML labels
 *  (`htmlLabels: true`, the mermaid default → `.nodeLabel` span) and pure-SVG
 *  labels (`<text>`/`<tspan>`). */
const NODE_LABEL_SELECTOR = ".nodeLabel, text, tspan, .label foreignObject div";

/**
 * Background token for edge labels in dark mode. Mermaid's dark theme paints a
 * mid-gray (~`hsl(0,0%,34%)`) box behind each edge label so it masks the line
 * it sits on; on a dark canvas that reads as a clunky gray chip. We repoint it
 * at the host card color so the label's mask blends invisibly into the diagram
 * card (still hiding the line behind it), with a dark hex fallback for hosts
 * that don't define `--card`.
 */
const DARK_EDGE_LABEL_BG = "var(--card, #0d1117)";

/** Selector-substring test for the mermaid rules that paint the edge-label
 *  background box. */
const EDGE_LABEL_RULE_RE = /edgeLabel|labelBkg/i;

/**
 * Rewrite the mermaid `<style>` block so edge-label background boxes use
 * {@link DARK_EDGE_LABEL_BG} instead of the theme's gray. Only rules whose
 * selector references `edgeLabel`/`labelBkg` are touched: their
 * `background-color`/`fill` is repointed and the mask `rect`'s `opacity:0.5`
 * (which would half-show the line through a now-card-colored mask) is set to 1.
 * Returns the CSS unchanged if there is nothing to rewrite.
 */
export function toneDownDarkEdgeLabels(css: string | null | undefined): string {
  if (!css) return "";
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (whole, selector: string, decls: string) => {
    if (!EDGE_LABEL_RULE_RE.test(selector)) return whole;
    const rewritten = decls
      .replace(/background-color\s*:\s*[^;]+/gi, `background-color:${DARK_EDGE_LABEL_BG}`)
      .replace(/fill\s*:\s*[^;]+/gi, `fill:${DARK_EDGE_LABEL_BG}`)
      .replace(/opacity\s*:\s*0?\.5\b/gi, "opacity:1");
    return `${selector}{${rewritten}}`;
  });
}

/** Options for {@link recolorMermaidLabels}. */
export interface RecolorOptions {
  /**
   * Dark-mode behavior. When true, a washed-out LIGHT author fill is deepened
   * to a saturated dark-theme version of the same hue (via
   * {@link deepenFillForDark}) and the label is set light — so green/amber/red
   * read as real colors on a dark canvas instead of near-white boxes. When
   * false (light mode) fills are left untouched and the label is simply set to
   * the token that contrasts with the existing fill. Default false.
   */
  deepenLightFills?: boolean;
}

/**
 * Recolor mermaid node labels — and, in dark mode, deepen washed-out author
 * fills — so author-colored nodes read correctly in both themes.
 *
 * Input/output is the raw SVG string mermaid returns. For every `g.node` that
 * has an explicit author fill (inline shape `style`/`fill` attr, or a
 * `classDef` fill matched via the node's CSS classes):
 *   - LIGHT mode (`deepenLightFills` false): leave the fill; set the label to
 *     the token that contrasts with it (light fill → dark label, dark → light).
 *   - DARK mode (`deepenLightFills` true): if the fill is light, replace it with
 *     a deep same-hue version and set a light label; if it is already dark, keep
 *     it and set a light label.
 * Nodes with no explicit fill are left untouched — the mermaid theme owns them.
 *
 * Safe no-op — returns `svg` unchanged — when the DOM APIs are unavailable
 * (SSR / non-DOM host) or the string contains no `<svg>` root.
 *
 * Parsing note: we parse with the LENIENT `text/html` mode, NOT
 * `image/svg+xml`. Mermaid's HTML labels (`htmlLabels: true`, the default)
 * embed unclosed HTML void tags like `<br>` inside `<foreignObject>`; the
 * strict XML parser rejects those with an "opening/ending tag mismatch" and
 * would drop every node after the first `<br>`. The HTML parser handles inline
 * SVG + foreignObject correctly (right namespaces, camelCase element names
 * preserved) and `outerHTML` reserializes to the exact HTML-string form the
 * viewer re-injects via `dangerouslySetInnerHTML` — so this round-trips safely.
 */
export function recolorMermaidLabels(svg: string, options: RecolorOptions = {}): string {
  if (typeof DOMParser === "undefined" || !svg) return svg;
  const { deepenLightFills = false } = options;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(svg, "text/html");
  } catch {
    return svg;
  }
  const root = doc.querySelector("svg");
  if (!root) return svg;

  const styleEl = root.querySelector("style");
  const styleBlock = styleEl?.textContent ?? null;
  const classFills = classFillsFromStyleBlock(styleBlock);

  let changed = false;

  // Dark mode: tone the gray edge-label boxes down to the card color so they
  // blend into the diagram instead of reading as gray chips.
  if (deepenLightFills && styleEl?.textContent) {
    const toned = toneDownDarkEdgeLabels(styleEl.textContent);
    if (toned !== styleEl.textContent) {
      styleEl.textContent = toned;
      changed = true;
    }
  }

  const nodes = root.querySelectorAll("g.node");
  nodes.forEach((node) => {
    const shape = node.querySelector(NODE_SHAPE_SELECTOR);
    const fill = resolveNodeFill(node, classFills, shape);
    if (!fill) return;
    const rgb = parseColor(fill);
    if (!rgb) return;
    const isLight = relativeLuminance(rgb) >= LUMINANCE_MIDPOINT;

    let labelColor: string;
    if (deepenLightFills) {
      // Dark mode: deepen a washed light fill so its hue reads on black; a
      // fill that is already dark is left alone. Label always light.
      if (isLight && shape) setShapeFill(shape, deepenFillForDark(rgb));
      labelColor = LABEL_LIGHT;
    } else {
      // Light mode: keep the fill, pick a contrasting label.
      labelColor = isLight ? LABEL_DARK : LABEL_LIGHT;
    }
    applyLabelColor(node, labelColor);
    changed = true;
  });

  if (!changed) return svg;
  return root.outerHTML;
}

/** Resolve a node's effective fill from inline shape style/attr, then classDef. */
function resolveNodeFill(
  node: Element,
  classFills: Map<string, string>,
  shape: Element | null,
): string | null {
  if (shape) {
    const inline = fillFromStyle(shape.getAttribute("style"));
    if (inline) return inline;
    const attr = shape.getAttribute("fill");
    if (attr && parseColor(attr)) return attr;
  }
  // classDef path — the node carries the class name on its group.
  for (const cls of Array.from(node.classList)) {
    const f = classFills.get(cls);
    if (f) return f;
  }
  return null;
}

/** Override a node shape's fill with `!important` inline so it beats both the
 *  author's inline `fill:… !important` and a `classDef` stylesheet rule
 *  (inline important wins over external important). Stroke is left as authored
 *  so the saturated border still marks the hue. */
function setShapeFill(shape: Element, hex: string): void {
  (shape as HTMLElement | SVGElement).style.setProperty("fill", hex, "important");
}

/** Paint every label element under a node with the chosen readable color.
 *  `querySelectorAll` yields `Element`, which has no `style`; both concrete
 *  element interfaces that a label can be (`HTMLElement` for foreignObject
 *  content, `SVGElement` for `<text>`) expose `style` via `ElementCSSInlineStyle`,
 *  so we narrow to that union rather than reach for an escape hatch. */
function applyLabelColor(node: Element, color: string): void {
  node.querySelectorAll(NODE_LABEL_SELECTOR).forEach((label) => {
    // HTML labels (foreignObject) read `color`; setting it on the element and
    // letting it inherit covers the nested <p> mermaid wraps text in.
    (label as HTMLElement | SVGElement).style.color = color;
    // SVG <text>/<tspan> paint via the `fill` presentation attribute.
    const tag = label.nodeName.toLowerCase();
    if (tag === "text" || tag === "tspan") label.setAttribute("fill", color);
  });
}
