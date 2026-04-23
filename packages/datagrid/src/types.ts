export type ColumnType =
  // primitives (auto-inferrable)
  | "string"
  | "number"
  | "date"
  | "bool"
  // rich types (opt-in via `type:<col>=<type>` info-string flag)
  | "status"
  | "tags"
  | "checkmark"
  | "checkbox"
  | "rating"
  | "progress"
  | "currency"
  | "percentage"
  | "filesize"
  | "url"
  | "email"
  | "phone"
  | "code"
  | "color"
  | "relative"
  | "avatar"
  // v2 rich types
  | "sparkline"
  | "icon"
  | "country"
  | "duration"
  | "range"
  | "code-block"
  | "json"
  | "image"
  // meta
  | "id";

export type StatusTone =
  | "success"
  | "warn"
  | "danger"
  | "info"
  | "muted"
  | "primary"
  | "secondary";

export interface ColumnTypeArgs {
  /** For `status`: explicit `value → tone` overrides. */
  colors?: Record<string, StatusTone>;
  /** For `currency`: ISO code like `USD`, `EUR`. Defaults to `USD`. */
  currencyCode?: string;
  /** For `progress` / `rating`: scale endpoints. */
  max?: number;
  min?: number;
  /** For `tags` (split) / `range` / `sparkline` (split). */
  separator?: string;
  /** For `date` / `relative`: force locale override. */
  locale?: string;
  /** For `sparkline`: variant. */
  sparkStyle?: "line" | "bar" | "area";
  /** For `duration`: input unit. Default `s` (seconds). */
  durationUnit?: "s" | "ms" | "m" | "h";
}

export interface Column {
  key: string;
  label: string;
  type: ColumnType;
  align?: "left" | "right" | "center";
  hidden?: boolean;
  args?: ColumnTypeArgs;
}

export type CellValue = string | number | boolean | null;
export type Row = Record<string, CellValue>;

export interface ColumnTypeSpec {
  type: ColumnType;
  args?: ColumnTypeArgs;
}

export type AggFn = "sum" | "avg" | "min" | "max" | "count" | "uniq";

export type Density = "compact" | "comfy" | "relaxed";

export interface DataGridOptions {
  filter?: boolean;
  sort?: string | false;
  search?: boolean;
  hide?: string[];
  typeSpecs?: Record<string, ColumnTypeSpec>;
  aligns?: Record<string, "left" | "right" | "center">;
  delimiter?: string;
  header?: boolean;
  src?: string;
  height?: number;
  title?: string;
  stickyHeader?: boolean;
  pagination?: boolean;
  pageSize?: number;
  /** Key of the column to treat as the stable row id (required for
   *  interactive `checkbox` cells to persist). */
  idColumn?: string;
  /** Show a 1-based row-number column on the far left. */
  rowNumbers?: boolean;
  /** Per-column aggregation functions rendered in a sticky footer row. */
  agg?: Record<string, AggFn>;
  /** Column keys (left→right) pinned to the left during horizontal scroll. */
  freeze?: string[];
  /** Row height preset. */
  density?: Density;
  /** Show the checkbox selection column on the far left. */
  selection?: boolean;
  /** Group rows by the named column. Group headers collapse / expand. */
  groupBy?: string;
  /** Enable per-row expansion — prepends a chevron column; clicking it
   *  reveals a detail panel beneath the row with every column's value. */
  expandable?: boolean;
  /** Serialize / hydrate grid state (sort, filters, hide, density, groupBy,
   *  expand) to / from the URL hash so views are shareable. */
  urlSync?: boolean;
  /** Per-column initial width overrides (px). Wins over auto-size. The
   *  user can still resize and the new width is persisted. */
  widths?: Record<string, number>;
}

/** Per-type filter value shapes. Text cols use a string; numeric / date cols
 *  a [min, max] pair; multi-select a string[]; bool a tri-state. */
export type FilterValue =
  | string
  | [number | null, number | null]
  | [string | null, string | null]
  | string[]
  | boolean
  | null
  | undefined;

export interface DataGridTable {
  columns: Column[];
  rows: Row[];
}
