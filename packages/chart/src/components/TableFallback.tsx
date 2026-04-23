import type { Column, Row } from "@filemark/datagrid";
import { DataGrid } from "@filemark/datagrid";
import type { ChartOptions } from "../types";

/**
 * Opt-in (`show-table`) data-table fallback using the existing
 * datagrid. Exists for two reasons:
 *   1) Accessibility — screen readers traverse a real table much
 *      better than a rendered SVG chart.
 *   2) Honesty — when recharts fails to render something exotic,
 *      users still see their numbers.
 *
 * Render-sized density so it doesn't dominate the chart it accompanies.
 */
export function TableFallback({
  columns,
  rows,
  options,
}: {
  columns: Column[];
  rows: Row[];
  options: ChartOptions;
}) {
  return (
    <div className="-mx-3 mt-3 border-t border-border/60 pt-3">
      <DataGrid
        columns={columns}
        rows={rows}
        options={{
          filter: false,
          search: false,
          density: "compact",
          title: options.title ? `${options.title} — data` : "data",
          height: 220,
        }}
      />
    </div>
  );
}
