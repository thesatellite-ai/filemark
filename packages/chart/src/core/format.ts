import type { Column } from "@filemark/datagrid";
import type { FormatResolver, FormatSpec } from "../types";

/**
 * Formatter registry. Built-ins cover the column types the datagrid
 * already handles (currency / percentage / filesize / date / plain
 * number); custom formatters (e.g. `duration`) plug in via
 * `registerFormat(name, fn)`.
 *
 * Resolver is idempotent — calling it repeatedly returns the same
 * output for the same input, so it's safe to use in tick labels AND
 * tooltip content without caching concerns.
 */

export type FormatFn = (value: unknown, spec: FormatSpec, col?: Column) => string;

const FILESIZE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

function formatFilesize(n: number): string {
  let v = n;
  let i = 0;
  while (v >= 1024 && i < FILESIZE_UNITS.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${FILESIZE_UNITS[i]}`;
}

const builtins: Record<string, FormatFn> = {
  auto(value, _spec, col) {
    // Delegate to the column's inferred type when nothing more specific
    // was provided. Falls back to `toLocaleString`.
    if (col) {
      switch (col.type) {
        case "currency":
          return builtins.currency!(value, {
            kind: "currency",
            code: col.args?.currencyCode ?? "USD",
          });
        case "percentage":
          return builtins.percentage!(value, { kind: "percentage" });
        case "filesize":
          return builtins.filesize!(value, { kind: "filesize" });
        case "date":
        case "relative":
          return builtins.date!(value, { kind: "date" });
        case "number":
          return builtins.number!(value, { kind: "number" });
      }
    }
    return value == null ? "" : String(value);
  },
  number(value, spec) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return String(value ?? "");
    const max =
      (spec as Extract<FormatSpec, { kind: "number" }>).maxFractionDigits ?? 2;
    return n.toLocaleString(undefined, { maximumFractionDigits: max });
  },
  currency(value, spec) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return String(value ?? "");
    const code =
      (spec as Extract<FormatSpec, { kind: "currency" }>).code ?? "USD";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return n.toLocaleString();
    }
  },
  percentage(value) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return String(value ?? "");
    const pct = n > 0 && n <= 1 ? n * 100 : n;
    return `${pct.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  },
  filesize(value) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return String(value ?? "");
    return formatFilesize(n);
  },
  date(value) {
    const t = typeof value === "number" ? value : Date.parse(String(value));
    if (Number.isNaN(t)) return String(value ?? "");
    return new Date(t).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  },
};

export function registerFormat(name: string, fn: FormatFn): void {
  builtins[name] = fn;
}

export function getFormatter(): FormatResolver {
  return {
    format(value, spec, col) {
      const fn = builtins[spec.kind] ?? builtins.auto!;
      return fn(value, spec, col);
    },
  };
}

export const DEFAULT_FORMATTER = getFormatter();
