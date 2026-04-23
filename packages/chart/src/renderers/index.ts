/**
 * Side-effect registration of built-in chart types.
 *
 * Every `registerChartType()` is called at module load — so importing
 * `@filemark/chart/renderers` (transitively, via `Chart.tsx`) wires
 * every built-in into the registry. Host apps don't need to register
 * manually.
 *
 * To add a new built-in: drop a new file under `renderers/`, import it
 * here. To add a host-specific chart type: call `registerChartType`
 * from your own module; no edit to this file required.
 */
export { barRenderer } from "./bar";
export { lineRenderer } from "./line";
export { areaRenderer } from "./area";
export { pieRenderer } from "./pie";
export { scatterRenderer } from "./scatter";
export { funnelRenderer } from "./funnel";
export { radarRenderer } from "./radar";
