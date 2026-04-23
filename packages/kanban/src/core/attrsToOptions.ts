import type { KanbanOptions } from "../types";
import { parseKanbanInfoString } from "./parseInfoString";

/**
 * Convert `<Kanban …>` HTML-attribute props into `KanbanOptions`.
 * Mirrors the datagrid/chart `attrsToOptions` pattern — top-level
 * scalars win over a bulk `meta="…"` info-string. Complex
 * colon-bearing flags (`type:col=…`) can hide inside `meta=` since
 * HTML attribute names can't carry colons cleanly.
 */
export function attrsToKanbanOptions(p: Record<string, unknown>): KanbanOptions {
  const base: KanbanOptions = str(p.meta) ? parseKanbanInfoString(str(p.meta)) : {};

  const groupBy = str(p["group-by"]) ?? str(p.groupBy);
  if (groupBy) base.groupBy = groupBy;

  const order = list(p.order);
  if (order) base.order = order;

  const title = str(p.title);
  if (title) base.title = title;

  const cardTitle = str(p["card-title"]) ?? str(p.cardTitle);
  if (cardTitle) base.cardTitle = cardTitle;

  const cardFields = list(p["card-fields"]) ?? list(p.cardFields);
  if (cardFields) base.cardFields = cardFields;

  const cardBadge = str(p["card-badge"]) ?? str(p.cardBadge);
  if (cardBadge) base.cardBadge = cardBadge;

  const cardLayout = str(p["card-layout"]) ?? str(p.cardLayout);
  if (cardLayout) base.cardLayout = cardLayout;

  const idCol = str(p["id-column"]) ?? str(p.idColumn);
  if (idCol) base.idColumn = idCol;

  const hide = list(p.hide);
  if (hide) base.hide = hide;

  const sort = str(p.sort);
  if (sort) base.sort = sort;

  const count = bool(p.count);
  if (count !== undefined) base.count = count;

  const empty = bool(p.empty);
  if (empty !== undefined) base.empty = empty;

  const height = num(p.height);
  if (height !== undefined) base.height = height;

  const src = str(p.src);
  if (src) base.src = src;

  const delim = str(p.delimiter);
  if (delim) base.delimiter = delim === "\\t" ? "\t" : delim;

  const header = bool(p.header);
  if (header !== undefined) base.header = header;

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
  const items = s.split(",").map((x) => x.trim()).filter(Boolean);
  return items.length ? items : undefined;
}
