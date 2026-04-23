import type {
  AggFn,
  ColumnTypeSpec,
  DataGridOptions,
  Density,
} from "./types";
import { parseColumnType } from "./parseColumnType";

const BOOL_KEYS = new Set([
  "filter",
  "search",
  "header",
  "stickyHeader",
  "pagination",
  "rowNumbers",
  "selection",
  "expandable",
  "urlSync",
]);

const AGG_FNS: ReadonlySet<AggFn> = new Set<AggFn>([
  "sum",
  "avg",
  "min",
  "max",
  "count",
  "uniq",
]);

const DENSITY_VALUES: ReadonlySet<Density> = new Set<Density>([
  "compact",
  "comfy",
  "relaxed",
]);

export function parseInfoString(
  meta: string | undefined | null,
): DataGridOptions {
  const opts: DataGridOptions = {};
  if (!meta) return opts;

  const tokens = tokenize(meta.trim());
  const typeSpecs: Record<string, ColumnTypeSpec> = {};
  const aligns: Record<string, "left" | "right" | "center"> = {};

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

    if (key.startsWith("type:") && value) {
      const col = key.slice(5);
      const spec = parseColumnType(value);
      if (spec) {
        typeSpecs[col] = spec;
        if (spec.type === "id") opts.idColumn = col;
      } else {
        warnUnknown(raw, `unknown column type "${value}"`);
      }
      continue;
    }

    if (key.startsWith("align:") && value) {
      const col = key.slice(6);
      if (value === "left" || value === "right" || value === "center") {
        aligns[col] = value;
      } else {
        warnUnknown(raw, `align must be left|right|center`);
      }
      continue;
    }

    if (key.startsWith("width:") && value) {
      const col = key.slice(6);
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) {
        (opts.widths ??= {})[col] = n;
      } else {
        warnUnknown(raw, `width must be a positive number`);
      }
      continue;
    }

    if (key.startsWith("agg:") && value) {
      const col = key.slice(4);
      if (AGG_FNS.has(value as AggFn)) {
        (opts.agg ??= {})[col] = value as AggFn;
      } else {
        warnUnknown(raw, `agg must be one of ${[...AGG_FNS].join("|")}`);
      }
      continue;
    }

    switch (key) {
      case "filter":
      case "search":
      case "header":
      case "pagination": {
        const b = toBool(value, negated);
        if (b !== undefined) (opts as Record<string, unknown>)[key] = b;
        break;
      }
      case "sticky-header":
      case "stickyHeader": {
        const b = toBool(value, negated);
        if (b !== undefined) opts.stickyHeader = b;
        break;
      }
      case "row-numbers":
      case "rowNumbers": {
        const b = toBool(value, negated);
        if (b !== undefined) opts.rowNumbers = b;
        break;
      }
      case "id-column":
      case "id":
        if (value) opts.idColumn = value;
        break;
      case "sort":
        if (negated || value === "false") opts.sort = false;
        else if (value) opts.sort = value;
        break;
      case "hide":
        if (value)
          opts.hide = value.split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "delimiter":
        if (value) opts.delimiter = value === "\\t" ? "\t" : value;
        break;
      case "freeze":
        if (value) {
          opts.freeze = value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
        break;
      case "density":
        if (value && DENSITY_VALUES.has(value as Density)) {
          opts.density = value as Density;
        } else if (value) {
          warnUnknown(raw, `density must be compact|comfy|relaxed`);
        }
        break;
      case "group-by":
      case "groupBy":
        if (value) opts.groupBy = value;
        break;
      case "expandable": {
        const b = toBool(value, negated);
        if (b !== undefined) opts.expandable = b;
        break;
      }
      case "url-sync":
      case "urlSync": {
        const b = toBool(value, negated);
        if (b !== undefined) opts.urlSync = b;
        break;
      }
      case "src":
        if (value) opts.src = value;
        break;
      case "height":
        if (value) {
          const n = Number(value);
          if (!Number.isNaN(n)) opts.height = n;
        }
        break;
      case "title":
        if (value) opts.title = value;
        break;
      case "page-size":
      case "pageSize":
        if (value) {
          const n = Number(value);
          if (!Number.isNaN(n)) opts.pageSize = n;
        }
        break;
      default:
        if (BOOL_KEYS.has(key)) {
          const b = toBool(value, negated);
          if (b !== undefined) (opts as Record<string, unknown>)[key] = b;
        } else {
          warnUnknown(raw, `unknown datagrid flag "${key}"`);
        }
    }
  }

  if (Object.keys(typeSpecs).length) opts.typeSpecs = typeSpecs;
  if (Object.keys(aligns).length) opts.aligns = aligns;
  return opts;
}

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

function warnUnknown(token: string, message: string) {
  if (typeof console !== "undefined") {
    console.warn(`[@filemark/datagrid] ${message} (token: ${token})`);
  }
}
