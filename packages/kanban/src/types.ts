import type { ReactElement } from "react";
import type { Column, ColumnTypeSpec, Row } from "@filemark/datagrid";

export interface KanbanOptions {
  groupBy?: string;
  order?: string[];
  cardTitle?: string;
  cardFields?: string[];
  cardBadge?: string;
  cardLayout?: string;
  idColumn?: string;
  typeSpecs?: Record<string, ColumnTypeSpec>;
  aligns?: Record<string, "left" | "right" | "center">;
  hide?: string[];
  sort?: string;
  count?: boolean;
  empty?: boolean;
  title?: string;
  height?: number;
  src?: string;
  delimiter?: string;
  header?: boolean;
}

export interface KanbanGroup {
  /** Distinct value of the group-by column. */
  value: string;
  /** Rows whose group-by column equals `value`. */
  cards: Row[];
}

export interface CardRenderContext {
  row: Row;
  columns: Column[];
  options: KanbanOptions;
  /** Stable key for React — id column value or row index. */
  rowId: string;
}

/** Plug-in contract for a card layout. One file per renderer. */
export interface CardRenderer {
  readonly id: string;
  render(ctx: CardRenderContext): ReactElement;
}
