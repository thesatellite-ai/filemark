import type { Column, Row } from "@filemark/datagrid";
import { CellRenderer } from "@filemark/datagrid";
import type { KanbanOptions } from "../types";

/**
 * Default card layout: primary title + optional badge + one row per
 * card-field, rendered through the datagrid's CellRenderer so every
 * rich column type (status, avatar, tags, currency, etc.) just works.
 *
 * Plug-in model: any custom layout can be registered via
 * `registerCardRenderer()` and opted into with `card-layout=<id>`.
 */
export function Card({
  row,
  columns,
  options,
  rowId,
}: {
  row: Row;
  columns: Column[];
  options: KanbanOptions;
  rowId: string;
}) {
  const titleKey = resolveTitleKey(columns, options);
  const titleCol = titleKey
    ? columns.find((c) => c.key === titleKey)
    : undefined;
  const badgeCol = options.cardBadge
    ? columns.find((c) => c.key === options.cardBadge)
    : undefined;
  const fieldCols = resolveFieldCols(columns, options, titleKey);

  return (
    <article
      data-card-id={rowId}
      className="group/card flex min-w-0 flex-col gap-1.5 rounded-md border border-border/60 bg-card px-3 py-2 text-[12px] shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 break-words text-[12.5px] font-medium leading-snug text-foreground/90">
          {titleCol ? (
            <CellRenderer value={row[titleCol.key]} column={titleCol} />
          ) : (
            <span className="italic text-muted-foreground/70">(untitled)</span>
          )}
        </div>
        {badgeCol && (
          <div className="shrink-0">
            <CellRenderer value={row[badgeCol.key]} column={badgeCol} />
          </div>
        )}
      </div>
      {fieldCols.length > 0 && (
        <dl className="grid gap-x-2 gap-y-0.5 text-[11px]" style={{ gridTemplateColumns: "max-content 1fr" }}>
          {fieldCols.map((col) => (
            <div key={col.key} className="contents">
              <dt className="truncate text-muted-foreground/80 uppercase tracking-wider text-[9.5px] font-semibold self-center">
                {col.label}
              </dt>
              <dd className="min-w-0 break-words">
                <CellRenderer value={row[col.key]} column={col} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}

function resolveTitleKey(
  columns: Column[],
  options: KanbanOptions,
): string | undefined {
  if (options.cardTitle) return options.cardTitle;
  // Default: the first column that isn't groupBy and isn't the id column.
  const exclude = new Set(
    [options.groupBy, options.idColumn].filter(
      (k): k is string => !!k,
    ),
  );
  return columns.find(
    (c) => !exclude.has(c.key) && !(options.hide ?? []).includes(c.key),
  )?.key;
}

function resolveFieldCols(
  columns: Column[],
  options: KanbanOptions,
  titleKey: string | undefined,
): Column[] {
  const exclude = new Set<string>(
    [
      options.groupBy,
      options.idColumn,
      options.cardBadge,
      titleKey,
      ...(options.hide ?? []),
    ].filter((k): k is string => !!k),
  );
  if (options.cardFields && options.cardFields.length > 0) {
    return options.cardFields
      .map((key) => columns.find((c) => c.key === key))
      .filter((c): c is Column => !!c && !exclude.has(c.key));
  }
  return columns.filter((c) => !exclude.has(c.key));
}
