import type { ReactElement } from "react";
import type { Column, Row } from "@filemark/datagrid";

export type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "area"
  | "scatter"
  // ^ built-ins. Custom types registered at runtime land here too; the
  // string-intersection trick keeps TS autocomplete for known values
  // while still permitting any registered string.
  | (string & {});

/** Shape + semantics of the projected data a renderer consumes. */
export interface ChartData<Shape = unknown> {
  kind: "categorical" | "pie" | "scatter" | "custom";
  data: Shape;
  series: ChartSeriesConfig[];
  xLabel?: string;
  yLabel?: string;
}

/** Per-series rendering metadata, emitted by a renderer's `transform`. */
export interface ChartSeriesConfig {
  key: string;
  label: string;
  /** Semantic tone ("primary"/"success"/…) or hex. Empty → palette picks. */
  color?: string;
  format?: FormatSpec;
}

/** What a renderer receives on `render()`. */
export interface ChartRenderContext<Shape = unknown> {
  data: ChartData<Shape>;
  options: ChartOptions;
  /**
   * Effective height. Usually `options.height` (default 260), but the
   * fullscreen toggle can swap it to `"100%"` so `ResponsiveContainer`
   * fills the expanded frame. Renderers pass this straight to recharts'
   * `<ResponsiveContainer height={ctx.height}>`.
   */
  height: number | string;
  /** Lazy-loaded recharts module, passed down via RechartsProvider. */
  recharts: typeof import("recharts");
  palette: PaletteResolver;
  formatter: FormatResolver;
}

/** Plug-in contract for a chart type. One file per renderer. */
export interface ChartRenderer<Shape = unknown> {
  readonly type: ChartType;
  transform(
    columns: Column[],
    rows: Row[],
    options: ChartOptions,
  ): ChartData<Shape>;
  render(ctx: ChartRenderContext<Shape>): ReactElement;
  validate?(options: ChartOptions, columns: Column[]): string[];
  readonly defaultOptions?: Partial<ChartOptions>;
}

/** Resolves series / tone colors — registered by name, swappable at runtime. */
export interface PaletteResolver {
  /** Zero-indexed series color; wraps if i >= palette.length. */
  series(i: number): string;
  /** Color by semantic tone name (`primary`/`success`/`warn`/`danger`/`info`/`secondary`/`muted`). */
  tone(name: string): string;
  /** All tone names supported. */
  tones(): string[];
}

/** How a single value should render — per column or per series. */
export type FormatSpec =
  | { kind: "auto" }
  | { kind: "number"; maxFractionDigits?: number }
  | { kind: "currency"; code: string }
  | { kind: "percentage" }
  | { kind: "filesize" }
  | { kind: "date"; pattern?: string }
  // Custom formats are registered via `registerFormat(name, fn)`. The
  // string literal lets authors reach them from info-string flags like
  // `format:buildTime=duration`.
  | { kind: string; [arg: string]: unknown };

export interface FormatResolver {
  format(value: unknown, spec: FormatSpec, col?: Column): string;
}

/** The single source of truth for what an author configured. */
export interface ChartOptions {
  type: ChartType;

  // Common data-shape flags
  x?: string;
  y?: string[];
  by?: string;

  // Common display flags
  stacked?: boolean;
  horizontal?: boolean;
  smooth?: boolean;
  showDots?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showTable?: boolean;
  xLabel?: string;
  yLabel?: string;
  title?: string;
  height?: number;
  colors?: string[];
  paletteName?: string;
  formats?: Record<string, FormatSpec>;
  sort?: string;
  limit?: number;
  referenceLine?: number;
  /**
   * Vertical markers on categorical / time-series charts. Each is
   * `value:label` — the value matches an x-axis tick (category name
   * for bar/line/area, ISO date, etc.); the label is optional.
   * Example: `annotations=2026-03-01:Launch,2026-04-15:Pricing-change`.
   */
  annotations?: Array<{ x: string; label?: string }>;

  // Pie-specific
  name?: string;
  value?: string;
  donut?: boolean;
  showTotal?: boolean;

  // CSV-ingest (shared grammar w/ datagrid)
  src?: string;
  delimiter?: string;
  header?: boolean;
}
