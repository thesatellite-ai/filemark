// Components
export { Chart, type ChartProps } from "./components/Chart";
export {
  ChartFromText,
  type ChartFromTextProps,
} from "./components/ChartFromText";
export {
  ChartBlock,
  type ChartBlockProps,
} from "./components/ChartBlock";
export { ChartContainer } from "./components/ChartContainer";
export { ChartLoading } from "./components/ChartLoading";
export { TableFallback } from "./components/TableFallback";

// Plug-ins — chart-type registry
export {
  registerChartType,
  getChartRenderer,
  getRegisteredTypes,
  resetRegistry,
} from "./core/registry";

// Plug-ins — palettes
export {
  registerPalette,
  getPalette,
  withOverrides,
  DEFAULT_PALETTE,
  COLORBLIND_PALETTE,
} from "./core/palette";

// Plug-ins — formatters
export {
  registerFormat,
  getFormatter,
  DEFAULT_FORMATTER,
} from "./core/format";

// Parsers (for host composition)
export { parseChartInfoString } from "./core/parseInfoString";
export { attrsToChartOptions } from "./core/attrsToOptions";

// Lazy recharts (for advanced host integration — custom renderers
// usually only need the Provider; host apps can reuse it).
export {
  RechartsProvider,
  useRecharts,
  loadRecharts,
} from "./core/lazyRecharts";

// Shared transforms (for custom renderer authors)
export {
  transformCategorical,
  transformPie,
  transformScatter,
} from "./renderers/shared/transforms";

// Shared helpers for custom renderer authors
export { CustomTooltip } from "./renderers/shared/CustomTooltip";
export { ChartErrorCard } from "./renderers/shared/ErrorCard";
export { renderAnnotations } from "./renderers/shared/Annotations";
export {
  validateCategorical,
  validatePie,
  warnIfMissing,
  warnIfMissingList,
  warnIfNotNumeric,
} from "./renderers/shared/validators";

// Aria label helper
export { chartAriaLabel } from "./core/ariaLabel";

// Types
export type {
  ChartType,
  ChartOptions,
  ChartData,
  ChartRenderer,
  ChartRenderContext,
  ChartSeriesConfig,
  PaletteResolver,
  FormatResolver,
  FormatSpec,
} from "./types";
