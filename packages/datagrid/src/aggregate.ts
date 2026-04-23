import type { AggFn, CellValue, Column, Row } from "./types";

export interface AggResult {
  fn: AggFn;
  /** Numeric result (for sum/avg/min/max) or a count/uniq integer. `null` when
   *  no numeric values are present for numeric aggregations. */
  value: number | null;
  /** Raw count of contributing rows (non-null/non-empty). */
  contributing: number;
}

export function aggregate(
  fn: AggFn,
  rows: Row[],
  colKey: string,
): AggResult {
  const raw = rows.map((r) => r[colKey]);
  const nonBlank = raw.filter(
    (v) => v !== null && v !== undefined && v !== "",
  );
  const nums = nonBlank
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => Number.isFinite(n)) as number[];

  const contributing = nonBlank.length;

  switch (fn) {
    case "sum":
      return {
        fn,
        value: nums.length ? nums.reduce((a, b) => a + b, 0) : null,
        contributing,
      };
    case "avg":
      return {
        fn,
        value: nums.length
          ? nums.reduce((a, b) => a + b, 0) / nums.length
          : null,
        contributing,
      };
    case "min":
      return {
        fn,
        value: nums.length ? Math.min(...nums) : null,
        contributing,
      };
    case "max":
      return {
        fn,
        value: nums.length ? Math.max(...nums) : null,
        contributing,
      };
    case "count":
      return { fn, value: contributing, contributing };
    case "uniq":
      return {
        fn,
        value: new Set(nonBlank.map((v) => String(v))).size,
        contributing,
      };
  }
}

/** Format an aggregate result using the column's type — so `sum` of a
 *  `currency` column comes out as `$1,234.00`, `sum` of a `percentage`
 *  column keeps the `%`, etc. `count` / `uniq` always format as plain integers
 *  regardless of column type. */
export function formatAgg(
  result: AggResult,
  column: Column,
): { label: string; value: string } {
  if (result.value === null) {
    return { label: result.fn, value: "—" };
  }
  if (result.fn === "count" || result.fn === "uniq") {
    return { label: result.fn, value: result.value.toLocaleString() };
  }
  const v = result.value;
  const label = result.fn;
  if (column.type === "currency") {
    const code = column.args?.currencyCode ?? "USD";
    try {
      return {
        label,
        value: new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: code,
          maximumFractionDigits: 2,
        }).format(v),
      };
    } catch {
      return { label, value: v.toLocaleString() };
    }
  }
  if (column.type === "percentage") {
    const pct = v > 0 && v <= 1 ? v * 100 : v;
    return {
      label,
      value: `${pct.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`,
    };
  }
  if (column.type === "filesize") {
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    let size = v;
    let i = 0;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return {
      label,
      value: `${size.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${units[i]}`,
    };
  }
  return {
    label,
    value: v.toLocaleString(undefined, { maximumFractionDigits: 2 }),
  };
}

/** Convenience for the footer renderer: iterate configured aggregations. */
export function collectAggs(
  agg: Record<string, AggFn> | undefined,
  columns: Column[],
  rows: Row[],
): Map<string, { result: AggResult; column: Column }> {
  const out = new Map<string, { result: AggResult; column: Column }>();
  if (!agg) return out;
  for (const col of columns) {
    const fn = agg[col.key];
    if (!fn) continue;
    out.set(col.key, {
      result: aggregate(fn, rows, col.key),
      column: col,
    });
  }
  return out;
}

// `CellValue` import kept for potential future per-cell aggregation
// hooks (e.g. custom reducers). Referenced via type position only.
export type _CellValue = CellValue;
