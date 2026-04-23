import type { Column } from "@filemark/datagrid";
import type { ChartOptions } from "../../types";

/**
 * Shared validate helpers. Each returns a list of warning strings —
 * every renderer's `validate(options, columns)` composes the ones
 * that apply to its shape.
 */

const NUMERIC_TYPES = new Set([
  "number",
  "currency",
  "percentage",
  "filesize",
  "progress",
  "rating",
]);

export function warnIfMissing(
  columns: Column[],
  key: string | undefined,
  label: string,
): string[] {
  if (!key) return [];
  if (columns.some((c) => c.key === key)) return [];
  const known = columns.map((c) => c.key).join(", ");
  return [`${label} "${key}" is not a column. Available: ${known || "(none)"}`];
}

export function warnIfMissingList(
  columns: Column[],
  keys: string[] | undefined,
  label: string,
): string[] {
  if (!keys || keys.length === 0) return [];
  const known = new Set(columns.map((c) => c.key));
  const bad = keys.filter((k) => !known.has(k));
  if (bad.length === 0) return [];
  return [
    `${label} ${bad.map((b) => `"${b}"`).join(", ")} not in columns [${Array.from(known).join(", ")}]`,
  ];
}

export function warnIfNotNumeric(
  columns: Column[],
  keys: string[] | undefined,
  label: string,
): string[] {
  if (!keys || keys.length === 0) return [];
  const known = new Map(columns.map((c) => [c.key, c]));
  const bad = keys.filter((k) => {
    const col = known.get(k);
    if (!col) return false; // missing handled by warnIfMissingList
    return !NUMERIC_TYPES.has(col.type);
  });
  if (bad.length === 0) return [];
  return [
    `${label} ${bad.map((b) => `"${b}"`).join(", ")} is not a numeric column. Chart may show zeros or NaN.`,
  ];
}

/** Bar / line / area: share the same x + y[] validation. */
export function validateCategorical(
  options: ChartOptions,
  columns: Column[],
): string[] {
  const warnings: string[] = [];
  warnings.push(...warnIfMissing(columns, options.x, "x"));
  if (options.by) {
    warnings.push(...warnIfMissing(columns, options.by, "by"));
  }
  const yKeys = options.y;
  warnings.push(...warnIfMissingList(columns, yKeys, "y"));
  warnings.push(...warnIfNotNumeric(columns, yKeys, "y"));
  return warnings;
}

/** Pie: uses `name` / `value` aliases. */
export function validatePie(
  options: ChartOptions,
  columns: Column[],
): string[] {
  const warnings: string[] = [];
  const nameKey = options.name ?? options.x;
  const valueKey = options.value ?? options.y?.[0];
  warnings.push(...warnIfMissing(columns, nameKey, "name"));
  warnings.push(...warnIfMissing(columns, valueKey, "value"));
  if (valueKey) {
    warnings.push(...warnIfNotNumeric(columns, [valueKey], "value"));
  }
  return warnings;
}
