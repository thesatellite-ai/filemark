import type { Column, Row } from "@filemark/datagrid";
import type {
  ChartData,
  ChartOptions,
  ChartSeriesConfig,
} from "../../types";

/**
 * Shared transforms used by multiple chart types.
 *
 * - Bar / line / area all want a `{xKey: string, y1: number, y2: …}`
 *   row shape. `transformCategorical` produces that + a
 *   `ChartSeriesConfig[]` for legend / tooltip / coloring.
 * - `by=<col>` pivots long-format data into wide-format series
 *   (e.g. `date,category,value` with `by=category` → one series per
 *   distinct category value).
 */
export function transformCategorical(
  columns: Column[],
  rows: Row[],
  options: ChartOptions,
): ChartData<Record<string, unknown>[]> {
  const xKey = options.x ?? columns[0]?.key ?? "x";
  const xCol = columns.find((c) => c.key === xKey);

  // Sort + limit before shaping
  const sorted = applySortAndLimit(rows, columns, options);

  // Pivot branch: by=<col> rewrites rows into one-row-per-x with columns
  // for each distinct `by` value.
  if (options.by) {
    const byKey = options.by;
    const valueKey =
      options.y?.[0] ??
      columns.find((c) => c.key !== xKey && c.key !== byKey)?.key ??
      "value";
    const distinct = Array.from(
      new Set(sorted.map((r) => String(r[byKey] ?? "")).filter(Boolean)),
    );
    const byX = new Map<string, Record<string, unknown>>();
    for (const r of sorted) {
      const xv = String(r[xKey] ?? "");
      if (!byX.has(xv)) byX.set(xv, { [xKey]: r[xKey] });
      const slot = byX.get(xv)!;
      slot[String(r[byKey] ?? "")] = coerceNumber(r[valueKey]);
    }
    const data = Array.from(byX.values());
    const series: ChartSeriesConfig[] = distinct.map((s) => ({
      key: s,
      label: s,
      format: options.formats?.[valueKey] ?? { kind: "auto" },
    }));
    return {
      kind: "categorical",
      data,
      series,
      xLabel: options.xLabel ?? xCol?.label ?? xKey,
      yLabel: options.yLabel ?? valueKey,
    };
  }

  // Normal wide-format: columns named in `y` become series.
  const yKeys =
    options.y ??
    columns.filter((c) => c.key !== xKey).map((c) => c.key).slice(0, 1);

  const data = sorted.map((r) => {
    const out: Record<string, unknown> = { [xKey]: r[xKey] };
    for (const k of yKeys) out[k] = coerceNumber(r[k]);
    return out;
  });

  const series: ChartSeriesConfig[] = yKeys.map((k) => {
    const col = columns.find((c) => c.key === k);
    return {
      key: k,
      label: col?.label ?? k,
      format: options.formats?.[k] ?? { kind: "auto" },
    };
  });

  return {
    kind: "categorical",
    data,
    series,
    xLabel: options.xLabel ?? xCol?.label ?? xKey,
    yLabel:
      options.yLabel ??
      (yKeys.length === 1
        ? (columns.find((c) => c.key === yKeys[0])?.label ?? yKeys[0])
        : undefined),
  };
}

/**
 * Pie / donut — wide-format with a `name` and `value` column.
 * Both arrive as `ChartOptions.name` / `.value` (pie-specific aliases
 * over `x` / `y[0]`).
 */
export function transformPie(
  columns: Column[],
  rows: Row[],
  options: ChartOptions,
): ChartData<Array<{ name: string; value: number; originalRow: Row }>> {
  const nameKey = options.name ?? options.x ?? columns[0]?.key ?? "name";
  const valueKey =
    options.value ?? options.y?.[0] ?? columns[1]?.key ?? "value";

  const sorted = applySortAndLimit(rows, columns, options);

  const data = sorted.map((r) => ({
    name: String(r[nameKey] ?? ""),
    value: coerceNumber(r[valueKey]) ?? 0,
    originalRow: r,
  }));

  const series: ChartSeriesConfig[] = [
    {
      key: valueKey,
      label:
        columns.find((c) => c.key === valueKey)?.label ?? valueKey,
      format: options.formats?.[valueKey] ?? { kind: "auto" },
    },
  ];

  return {
    kind: "pie",
    data,
    series,
    xLabel: nameKey,
    yLabel: valueKey,
  };
}

/**
 * Scatter — `{x: number, y: number}` points. Supports multi-series
 * via `by=<col>` (one scatter series per distinct by-value).
 */
export function transformScatter(
  columns: Column[],
  rows: Row[],
  options: ChartOptions,
): ChartData<Array<{ name: string; points: Array<{ x: number; y: number }> }>> {
  const xKey = options.x ?? columns[0]?.key ?? "x";
  const yKey = options.y?.[0] ?? columns[1]?.key ?? "y";
  const xCol = columns.find((c) => c.key === xKey);
  const yCol = columns.find((c) => c.key === yKey);
  const sorted = applySortAndLimit(rows, columns, options);

  const byKey = options.by;
  const groups = new Map<string, Array<{ x: number; y: number }>>();
  for (const r of sorted) {
    const g = byKey ? String(r[byKey] ?? "") : "_";
    const x = coerceNumber(r[xKey]);
    const y = coerceNumber(r[yKey]);
    if (x === undefined || y === undefined) continue;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push({ x, y });
  }

  const data = Array.from(groups.entries()).map(([name, points]) => ({
    name,
    points,
  }));
  const series: ChartSeriesConfig[] = data.map((g) => ({
    key: g.name,
    label: g.name === "_" ? (yCol?.label ?? yKey) : g.name,
    format: options.formats?.[yKey] ?? { kind: "auto" },
  }));

  return {
    kind: "scatter",
    data,
    series,
    xLabel: options.xLabel ?? xCol?.label ?? xKey,
    yLabel: options.yLabel ?? yCol?.label ?? yKey,
  };
}

/* ── helpers ─────────────────────────────────────────────────────── */

function applySortAndLimit(
  rows: Row[],
  columns: Column[],
  options: ChartOptions,
): Row[] {
  let out = rows;
  if (options.sort) {
    const [key, dirRaw] = options.sort.split(":");
    const dir = (dirRaw ?? "asc").toLowerCase() === "desc" ? -1 : 1;
    if (key) {
      const col = columns.find((c) => c.key === key);
      const isNumeric =
        col?.type === "number" ||
        col?.type === "currency" ||
        col?.type === "percentage" ||
        col?.type === "filesize" ||
        col?.type === "progress" ||
        col?.type === "rating";
      out = [...rows].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (isNumeric) {
          const an = coerceNumber(av) ?? Number.NEGATIVE_INFINITY;
          const bn = coerceNumber(bv) ?? Number.NEGATIVE_INFINITY;
          return dir * (an - bn);
        }
        return dir * String(av ?? "").localeCompare(String(bv ?? ""));
      });
    }
  }
  if (options.limit !== undefined && options.limit > 0) {
    out = out.slice(0, options.limit);
  }
  return out;
}

function coerceNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const n = Number(String(v).replace(/[$,%\s_]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}
