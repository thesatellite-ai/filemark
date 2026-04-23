import type { Column, Row } from "@filemark/datagrid";
import type { KanbanGroup, KanbanOptions } from "../types";

/**
 * Group rows by the named column, apply optional `order` + `sort`,
 * include empty groups when `empty` is true.
 */
export function groupRows(
  rows: Row[],
  columns: Column[],
  options: KanbanOptions,
): KanbanGroup[] {
  const groupBy = options.groupBy ?? columns[0]?.key;
  if (!groupBy) return [];

  // Within-group sort first, so each group's cards end up ordered.
  let working = rows;
  if (options.sort) {
    const [key, dirRaw] = options.sort.split(":");
    const dir = (dirRaw ?? "asc").toLowerCase() === "desc" ? -1 : 1;
    if (key) {
      const col = columns.find((c) => c.key === key);
      const numeric =
        col &&
        ["number", "currency", "percentage", "filesize", "progress", "rating"].includes(col.type);
      working = [...rows].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (numeric) {
          const an = toNumber(av);
          const bn = toNumber(bv);
          return dir * ((an ?? -Infinity) - (bn ?? -Infinity));
        }
        return dir * String(av ?? "").localeCompare(String(bv ?? ""));
      });
    }
  }

  const byValue = new Map<string, Row[]>();
  for (const r of working) {
    const v = String(r[groupBy] ?? "");
    if (!byValue.has(v)) byValue.set(v, []);
    byValue.get(v)!.push(r);
  }

  // Resolve column order: explicit `order=` first, then any remaining
  // distinct values in first-appearance order.
  const seen = new Set<string>();
  const ordered: string[] = [];
  if (options.order) {
    for (const v of options.order) {
      if (!seen.has(v)) {
        seen.add(v);
        ordered.push(v);
      }
    }
  }
  for (const v of byValue.keys()) {
    if (!seen.has(v)) {
      seen.add(v);
      ordered.push(v);
    }
  }

  const allowEmpty = options.empty !== false;
  const groups: KanbanGroup[] = [];
  for (const v of ordered) {
    const cards = byValue.get(v) ?? [];
    if (cards.length === 0 && !allowEmpty) continue;
    groups.push({ value: v, cards });
  }
  return groups;
}

function toNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const n = Number(String(v).replace(/[$,%\s_]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}
