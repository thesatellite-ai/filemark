import type { Column, ColumnTypeSpec } from "@filemark/datagrid";
import { parseColumnType } from "@filemark/datagrid";
import type { KanbanOptions } from "../types";

/**
 * Info-string parser for ```kanban fences. Same shell-ish tokenizer
 * shape as `@filemark/datagrid` — reuses its `parseColumnType` for
 * the `type:<col>=<expr>` flags so authors get consistent grammar
 * across components.
 */
export function parseKanbanInfoString(
  meta: string | undefined | null,
): KanbanOptions {
  const opts: KanbanOptions = {};
  if (!meta) return opts;

  const tokens = tokenize(meta.trim());
  const typeSpecs: Record<string, ColumnTypeSpec> = {};
  const aligns: Record<string, NonNullable<Column["align"]>> = {};

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
        warn(raw, `unknown column type "${value}"`);
      }
      continue;
    }

    if (key.startsWith("align:") && value) {
      const col = key.slice(6);
      if (value === "left" || value === "right" || value === "center") {
        aligns[col] = value;
      }
      continue;
    }

    switch (key) {
      case "group-by":
      case "groupBy":
        if (value) opts.groupBy = value;
        break;
      case "order":
        if (value) opts.order = value.split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "card-title":
      case "cardTitle":
        if (value) opts.cardTitle = value;
        break;
      case "card-fields":
      case "cardFields":
        if (value)
          opts.cardFields = value.split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "card-badge":
      case "cardBadge":
        if (value) opts.cardBadge = value;
        break;
      case "card-layout":
      case "cardLayout":
        if (value) opts.cardLayout = value;
        break;
      case "id-column":
      case "idColumn":
        if (value) opts.idColumn = value;
        break;
      case "hide":
        if (value) opts.hide = value.split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "sort":
        if (value) opts.sort = value;
        break;
      case "count": {
        const b = toBool(value, negated);
        if (b !== undefined) opts.count = b;
        break;
      }
      case "empty": {
        const b = toBool(value, negated);
        if (b !== undefined) opts.empty = b;
        break;
      }
      case "title":
        if (value) opts.title = value;
        break;
      case "height":
        if (value) {
          const n = Number(value);
          if (Number.isFinite(n)) opts.height = n;
        }
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
        warn(raw, `unknown kanban flag "${key}"`);
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

function warn(token: string, msg: string) {
  if (typeof console !== "undefined") {
    console.warn(`[@filemark/kanban] ${msg} (token: ${token})`);
  }
}
