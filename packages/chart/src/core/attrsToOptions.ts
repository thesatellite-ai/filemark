import type { ChartOptions, ChartType } from "../types";
import { parseChartInfoString } from "./parseInfoString";

/**
 * Convert `<Chart …>` HTML-attribute props into `ChartOptions`.
 * Mirrors the datagrid's `attrsToOptions` pattern — top-level scalars
 * win over a bulk `meta="…"` info-string. Author uses whichever reads
 * best; complex colon-bearing flags (format:col=…) can hide inside
 * `meta=` since HTML attribute names can't carry colons cleanly.
 */
export function attrsToChartOptions(p: Record<string, unknown>): ChartOptions {
  const base: ChartOptions = str(p.meta)
    ? parseChartInfoString(str(p.meta))
    : { type: "bar" };

  // Top-level scalar overrides.
  const type = str(p.type);
  if (type) base.type = type as ChartType;

  const x = str(p.x);
  if (x) base.x = x;

  const y = str(p.y);
  if (y) base.y = y.split(",").map(s => s.trim()).filter(Boolean);

  const by = str(p.by);
  if (by) base.by = by;

  const title = str(p.title);
  if (title) base.title = title;

  const src = str(p.src);
  if (src) base.src = src;

  const xLabel = str(p["x-label"]) ?? str(p.xLabel);
  if (xLabel) base.xLabel = xLabel;
  const yLabel = str(p["y-label"]) ?? str(p.yLabel);
  if (yLabel) base.yLabel = yLabel;

  const height = num(p.height);
  if (height !== undefined) base.height = height;

  const limit = num(p.limit);
  if (limit !== undefined) base.limit = limit;

  const ref = num(p["reference-line"]) ?? num(p.referenceLine);
  if (ref !== undefined) base.referenceLine = ref;

  const colors = list(p.colors);
  if (colors) base.colors = colors;

  const palette = str(p.palette);
  if (palette) base.paletteName = palette;

  const sort = str(p.sort);
  if (sort) base.sort = sort;

  const delim = str(p.delimiter);
  if (delim) base.delimiter = delim === "\\t" ? "\t" : delim;

  const name = str(p.name);
  if (name) base.name = name;

  const value = str(p.value);
  if (value) base.value = value;

  const bools: [string, keyof ChartOptions][] = [
    ["stacked", "stacked"],
    ["horizontal", "horizontal"],
    ["smooth", "smooth"],
    ["donut", "donut"],
    ["show-total", "showTotal"],
    ["show-dots", "showDots"],
    ["show-grid", "showGrid"],
    ["show-legend", "showLegend"],
    ["show-x-axis", "showXAxis"],
    ["show-y-axis", "showYAxis"],
    ["show-table", "showTable"],
    ["header", "header"],
  ];
  for (const [attr, key] of bools) {
    const b = bool(p[attr]) ?? bool(p[kebabToCamel(attr)]);
    if (b !== undefined) (base as unknown as Record<string, unknown>)[key] = b;
  }

  return base;
}

function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function bool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (s === "true" || s === "yes" || s === "on" || s === "1") return true;
  if (s === "false" || s === "no" || s === "off" || s === "0") return false;
  return undefined;
}

function list(v: unknown): string[] | undefined {
  const s = str(v);
  if (!s) return undefined;
  const items = s.split(",").map(x => x.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}
