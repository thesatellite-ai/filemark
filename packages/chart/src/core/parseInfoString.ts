import type { ChartOptions, ChartType, FormatSpec } from "../types";

/**
 * Parse an info-string (the part after ` ```chart ` on a fenced block)
 * into `ChartOptions`. Same shell-ish grammar as `@filemark/datagrid`'s
 * parser — whitespace-split, quotes respected, parens group internal
 * whitespace. Keeping the tokenizer here (rather than importing the
 * datagrid's) makes the chart package self-contained; the grammar
 * stays in sync by convention (both do exactly what `"a b=c d='e f'"`
 * should do).
 */
export function parseChartInfoString(
  meta: string | undefined | null,
  defaults?: { defaultType?: ChartType },
): ChartOptions {
  const opts: ChartOptions = {
    type: defaults?.defaultType ?? "bar",
  };
  if (!meta) return opts;

  const tokens = tokenize(meta.trim());
  const formats: Record<string, FormatSpec> = {};

  for (const raw of tokens) {
    if (!raw) continue;
    const eq = raw.indexOf("=");
    let key = eq === -1 ? raw : raw.slice(0, eq);
    let value: string | undefined = eq === -1 ? undefined : raw.slice(eq + 1);
    if (value !== undefined) value = stripQuotes(value);

    let negated = false;
    if (key.startsWith("no-")) {
      negated = true;
      key = key.slice(3);
    }

    // Per-column format specs — `format:col=currency(USD)`.
    if (key.startsWith("format:") && value) {
      const col = key.slice(7);
      formats[col] = parseFormatSpec(value);
      continue;
    }

    switch (key) {
      case "type":
        if (value) opts.type = value as ChartType;
        break;
      case "x":
        if (value) opts.x = value;
        break;
      case "y":
        if (value) opts.y = value.split(",").map(s => s.trim()).filter(Boolean);
        break;
      case "by":
        if (value) opts.by = value;
        break;
      case "name":
        if (value) opts.name = value;
        break;
      case "value":
        if (value) opts.value = value;
        break;

      case "stacked":
      case "horizontal":
      case "smooth":
      case "donut":
      case "show-total":
      case "show-dots":
      case "show-grid":
      case "show-legend":
      case "show-x-axis":
      case "show-y-axis":
      case "show-table": {
        const b = toBool(value, negated);
        if (b !== undefined) {
          const field = kebabToCamel(key);
          (opts as unknown as Record<string, unknown>)[field] = b;
        }
        break;
      }

      case "title":
        if (value) opts.title = value;
        break;
      case "x-label":
      case "xLabel":
        if (value) opts.xLabel = value;
        break;
      case "y-label":
      case "yLabel":
        if (value) opts.yLabel = value;
        break;

      case "height":
        if (value) {
          const n = Number(value);
          if (Number.isFinite(n)) opts.height = n;
        }
        break;
      case "limit":
        if (value) {
          const n = Number(value);
          if (Number.isFinite(n)) opts.limit = n;
        }
        break;
      case "reference-line":
      case "referenceLine":
        if (value) {
          const n = Number(value);
          if (Number.isFinite(n)) opts.referenceLine = n;
        }
        break;

      case "colors":
        if (value) opts.colors = value.split(",").map(s => s.trim()).filter(Boolean);
        break;
      case "annotations":
        if (value) {
          const parsed: Array<{ x: string; label?: string }> = [];
          for (const pair of value.split(",")) {
            const [x, ...rest] = pair.split(":");
            if (!x) continue;
            const label = rest.join(":").trim();
            parsed.push(label ? { x: x.trim(), label } : { x: x.trim() });
          }
          if (parsed.length) opts.annotations = parsed;
        }
        break;
      case "palette":
        if (value) opts.paletteName = value;
        break;

      case "sort":
        if (value) opts.sort = value;
        break;

      case "src":
        if (value) opts.src = value;
        break;
      case "delimiter":
        if (value) opts.delimiter = value === "\\t" ? "\t" : value;
        break;
      case "header": {
        const b = toBool(value, negated);
        if (b !== undefined) opts.header = b;
        break;
      }

      default:
        warnUnknown(raw, `unknown chart flag "${key}"`);
    }
  }

  if (Object.keys(formats).length) opts.formats = formats;
  return opts;
}

/**
 * Parse a spec like `currency(USD)`, `number(0)`, `percentage`, `date`.
 * Unknown kinds pass through as `{ kind: name }` so custom formatters
 * registered via `registerFormat(name, fn)` still work.
 */
function parseFormatSpec(expr: string): FormatSpec {
  const trimmed = expr.trim();
  const p = trimmed.indexOf("(");
  const kind = (p === -1 ? trimmed : trimmed.slice(0, p)).toLowerCase();
  const args = p === -1 ? "" : trimmed.slice(p + 1, trimmed.lastIndexOf(")")).trim();

  switch (kind) {
    case "auto":
      return { kind: "auto" };
    case "number":
      return args
        ? { kind: "number", maxFractionDigits: Number(args) || 0 }
        : { kind: "number" };
    case "currency":
      return { kind: "currency", code: args || "USD" };
    case "percentage":
    case "percent":
      return { kind: "percentage" };
    case "filesize":
      return { kind: "filesize" };
    case "date":
      return args ? { kind: "date", pattern: args } : { kind: "date" };
    default:
      // Unknown name → stored as-is; custom formatters can pick it up.
      return { kind, args } as FormatSpec;
  }
}

/* ── Shared helpers (same grammar as the datagrid's tokenizer) ── */

function tokenize(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  let paren = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "(") {
      paren++;
      cur += c;
    } else if (c === ")") {
      paren = Math.max(0, paren - 1);
      cur += c;
    } else if ((c === " " || c === "\t") && paren === 0) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
    } else {
      cur += c;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function stripQuotes(v: string): string {
  if (v.length >= 2) {
    const q = v[0];
    if ((q === '"' || q === "'") && v[v.length - 1] === q) {
      return v.slice(1, -1);
    }
  }
  return v;
}

function toBool(v: string | undefined, negated: boolean): boolean | undefined {
  if (negated && v === undefined) return false;
  if (v === undefined) return true;
  const low = v.toLowerCase();
  if (low === "true" || low === "yes" || low === "on" || low === "1")
    return !negated;
  if (low === "false" || low === "no" || low === "off" || low === "0")
    return negated;
  return undefined;
}

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}

function warnUnknown(token: string, message: string) {
  if (typeof console !== "undefined") {
    console.warn(`[@filemark/chart] ${message} (token: ${token})`);
  }
}
