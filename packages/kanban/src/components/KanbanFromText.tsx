import { useMemo } from "react";
import { parseCSV } from "@filemark/datagrid";
import type { KanbanOptions } from "../types";
import { Kanban } from "./Kanban";

export interface KanbanFromTextProps {
  text: string;
  options: KanbanOptions;
}

/**
 * Parses CSV text through the datagrid's `parseCSV` (so type inference
 * + coercion + delimiter auto-detect stay consistent across components)
 * and feeds the resulting {columns, rows} to `<Kanban>`.
 */
export function KanbanFromText({ text, options }: KanbanFromTextProps) {
  const table = useMemo(
    () =>
      parseCSV({
        text,
        delimiter: options.delimiter,
        header: options.header ?? true,
        typeSpecs: options.typeSpecs,
        alignHints: options.aligns,
        hide: options.hide,
      }),
    [text, options.delimiter, options.header, options.typeSpecs, options.aligns, options.hide],
  );

  return (
    <Kanban columns={table.columns} rows={table.rows} options={options} />
  );
}
