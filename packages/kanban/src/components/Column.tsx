import type { ReactNode } from "react";
import type { KanbanGroup } from "../types";

const MIN_COLUMN_WIDTH = 240;

/**
 * One kanban column — sticky header + vertical stack of cards.
 * Minimum width prevents cards from collapsing to unreadable widths;
 * horizontal overflow is owned by the parent `<Board>`.
 */
export function Column({
  group,
  showCount,
  children,
}: {
  group: KanbanGroup;
  showCount: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="flex shrink-0 flex-col gap-2 rounded-lg bg-muted/30 px-2 py-2"
      style={{ width: MIN_COLUMN_WIDTH, minWidth: MIN_COLUMN_WIDTH }}
    >
      <header className="sticky top-0 z-[1] flex items-center justify-between gap-1 rounded-md bg-muted/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/75 backdrop-blur">
        <span className="truncate">
          {group.value || (
            <em className="text-muted-foreground/70 normal-case tracking-normal">
              (empty)
            </em>
          )}
        </span>
        {showCount && (
          <span className="shrink-0 rounded-full bg-background/60 px-1.5 text-[10px] font-normal tabular-nums text-muted-foreground">
            {group.cards.length}
          </span>
        )}
      </header>
      <div className="flex min-h-0 flex-col gap-2">
        {children}
        {group.cards.length === 0 && (
          <div className="rounded-md border border-dashed border-border/60 px-3 py-4 text-center text-[11px] italic text-muted-foreground/70">
            no cards
          </div>
        )}
      </div>
    </div>
  );
}
