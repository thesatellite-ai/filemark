import { useEffect, useState } from "react";
import type { Column, Row } from "@filemark/datagrid";
import type { KanbanOptions } from "../types";
import { groupRows } from "../core/groupRows";
import { Board } from "./Board";
import { Column as KColumn } from "./Column";
import { Card } from "./Card";

export interface KanbanProps {
  columns: Column[];
  rows: Row[];
  options: KanbanOptions;
}

/**
 * Top-level kanban component. Consumes pre-parsed columns+rows,
 * groups them, renders a horizontal scrollable board. Owns the
 * fullscreen toggle (mirrors the chart's pattern).
 */
export function Kanban({ columns, rows, options }: KanbanProps) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  // Validate minimally. Missing group-by renders an error card
  // rather than a flat list of cards in a single un-labeled column.
  const groupByKey = options.groupBy ?? columns[0]?.key;
  const groupByExists = groupByKey && columns.some((c) => c.key === groupByKey);

  const fatalMessages: string[] = [];
  if (!groupByExists) {
    fatalMessages.push(
      options.groupBy
        ? `group-by "${options.groupBy}" is not a column. Available: ${columns.map((c) => c.key).join(", ")}`
        : "no columns in data — kanban needs at least one",
    );
  }

  const groups = groupByExists ? groupRows(rows, columns, options) : [];
  const showCount = options.count !== false;

  const wrapperClass = fullscreen
    ? "not-prose fixed inset-4 z-50 flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card shadow-2xl"
    : "not-prose my-4 w-full overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm";

  const boardHeight: number | string = fullscreen
    ? "100%"
    : options.height ?? 420;

  return (
    <>
      {fullscreen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
          onClick={() => setFullscreen(false)}
          aria-hidden="true"
        />
      )}
      <figure
        role="figure"
        aria-label={options.title ?? "kanban board"}
        className={wrapperClass}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5">
          <figcaption className="truncate text-[11.5px] font-medium tracking-tight text-foreground/80">
            {options.title ?? (
              <span className="uppercase tracking-wider text-[10.5px] text-muted-foreground">
                kanban · {groups.length} column{groups.length === 1 ? "" : "s"}
                {" · "}
                {rows.length} card{rows.length === 1 ? "" : "s"}
              </span>
            )}
          </figcaption>
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            title={
              fullscreen ? "Exit fullscreen (Esc)" : "Expand to fullscreen"
            }
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className={
              fullscreen
                ? "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10.5px] font-medium text-muted-foreground opacity-80 transition-colors hover:bg-accent/60 hover:text-foreground"
                : "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10.5px] font-medium text-muted-foreground opacity-60 transition-opacity transition-colors hover:bg-accent/60 hover:text-foreground hover:opacity-100 focus-visible:opacity-100"
            }
          >
            {fullscreen ? (
              <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
                <path
                  d="M5 1 L5 5 L1 5 M7 1 L7 5 L11 5 M5 11 L5 7 L1 7 M7 11 L7 7 L11 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
                <path
                  d="M1 4 L1 1 L4 1 M8 1 L11 1 L11 4 M1 8 L1 11 L4 11 M8 11 L11 11 L11 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
        {fatalMessages.length > 0 ? (
          <div
            role="alert"
            className="m-3 flex flex-col gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs"
          >
            <div className="font-semibold text-amber-600 dark:text-amber-400">
              Kanban — misconfigured
            </div>
            <ul className="m-0 list-disc pl-5 text-foreground/80">
              {fatalMessages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        ) : (
          <Board height={boardHeight}>
            {groups.map((group) => (
              <KColumn
                key={group.value || "__empty"}
                group={group}
                showCount={showCount}
              >
                {group.cards.map((row, idx) => {
                  const rowId = options.idColumn
                    ? String(row[options.idColumn] ?? idx)
                    : String(idx);
                  return (
                    <Card
                      key={rowId}
                      rowId={rowId}
                      row={row}
                      columns={columns}
                      options={options}
                    />
                  );
                })}
              </KColumn>
            ))}
          </Board>
        )}
      </figure>
    </>
  );
}

