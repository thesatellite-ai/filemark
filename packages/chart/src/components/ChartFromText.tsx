import { useMemo } from "react";
import { parseCSV } from "@filemark/datagrid";
import type { ChartOptions } from "../types";
import { Chart } from "./Chart";

export interface ChartFromTextProps {
  text: string;
  options: ChartOptions;
  /** Default delimiter when not set in options. `"\t"` for tsv blocks. */
  defaultDelimiter?: string;
}

/**
 * Bridge between raw CSV/TSV text and a `<Chart>`. Uses
 * `@filemark/datagrid`'s `parseCSV` so type inference + coercion +
 * delimiter handling stay in lock-step across the two components.
 */
export function ChartFromText({
  text,
  options,
  defaultDelimiter,
}: ChartFromTextProps) {
  const table = useMemo(
    () =>
      parseCSV({
        text,
        delimiter: options.delimiter ?? defaultDelimiter,
        header: options.header ?? true,
      }),
    [text, options.delimiter, options.header, defaultDelimiter],
  );

  return (
    <Chart columns={table.columns} rows={table.rows} options={options} />
  );
}
