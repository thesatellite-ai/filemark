// Components
export { Kanban, type KanbanProps } from "./components/Kanban";
export {
  KanbanFromText,
  type KanbanFromTextProps,
} from "./components/KanbanFromText";
export {
  KanbanBlock,
  type KanbanBlockProps,
} from "./components/KanbanBlock";
export { Board } from "./components/Board";
export { Column as KanbanColumn } from "./components/Column";
export { Card as KanbanCard } from "./components/Card";

// Plug-in — card-layout registry
export {
  registerCardRenderer,
  getCardRenderer,
  getRegisteredLayouts,
} from "./core/registry";

// Parsers (for host composition)
export { parseKanbanInfoString } from "./core/parseInfoString";
export { attrsToKanbanOptions } from "./core/attrsToOptions";

// Helpers for custom card-renderer authors
export { groupRows } from "./core/groupRows";

// Types
export type {
  KanbanOptions,
  KanbanGroup,
  CardRenderer,
  CardRenderContext,
} from "./types";
