import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  type AggregationFnOption,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnSizingState,
  type ExpandedState,
  type GroupingState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { StorageAdapter } from "@filemark/core";
import type {
  CellValue,
  Column,
  DataGridOptions,
  Density,
  Row,
} from "./types";
import { CellRenderer } from "./CellRenderer";
import { collectAggs, formatAgg } from "./aggregate";
import {
  ColumnFilterInput,
  filterFamilyFor,
  filterFns,
  type FilterFamily,
} from "./filters";
import { readUrlState, writeUrlState } from "./url-sync";

export interface DataGridProps {
  columns: Column[];
  rows: Row[];
  options?: DataGridOptions;
  storage?: StorageAdapter;
  storageKey?: string;
  /** Authored source (e.g. the original ```csv fence body + meta) to show
   *  in the "Raw" toggle. Optional — the button hides when absent. */
  rawSource?: string;
  rawLang?: string;
  rawMeta?: string;
}

const DENSITY: Record<
  Density,
  { row: number; cellPy: string; fontPx: number }
> = {
  compact: { row: 26, cellPy: "py-0.5", fontPx: 12 },
  comfy: { row: 34, cellPy: "py-1.5", fontPx: 13 },
  relaxed: { row: 44, cellPy: "py-2.5", fontPx: 14 },
};

const MIN_COL_WIDTH = 80;
const MAX_COL_WIDTH = 480;
const DEFAULT_COL_WIDTH = 160;
const PX_PER_CHAR = 7.5;
const WIDTH_SAMPLE_ROWS = 30;
const SELECT_COL_WIDTH = 36;
const EXPAND_COL_WIDTH = 32;
const ROWNO_COL_WIDTH = 50;
const PAGE_JUMP = 10;

const AGG_FN_MAP: Record<string, AggregationFnOption<Row>> = {
  sum: "sum",
  avg: "mean",
  min: "min",
  max: "max",
  count: "count",
  uniq: "uniqueCount",
};

export function DataGrid({
  columns: inputColumns,
  rows,
  options = {},
  storage,
  storageKey,
  rawSource,
  rawLang,
  rawMeta,
}: DataGridProps) {
  const {
    filter = true,
    search = true,
    hide = [],
    height,
    title,
    stickyHeader = true,
    sort: sortOpt,
    idColumn,
    rowNumbers,
    agg,
    freeze = [],
    density: densityOpt,
    selection,
    groupBy,
    expandable,
    urlSync,
    widths,
  } = options;

  const initialVisibility: VisibilityState = useMemo(() => {
    const v: VisibilityState = {};
    for (const h of hide) v[h] = false;
    for (const c of inputColumns) if (c.hidden) v[c.key] = false;
    return v;
  }, [inputColumns, hide]);

  const initialSorting = useMemo<SortingState>(() => {
    if (typeof sortOpt !== "string") return [];
    // Comma-separated secondary sorts: `sort=priority:asc,revenue:desc`
    return sortOpt
      .split(",")
      .map((spec) => spec.trim())
      .filter(Boolean)
      .map((spec) => {
        const [col, dir] = spec.split(":");
        return col
          ? { id: col, desc: (dir ?? "").toLowerCase() === "desc" }
          : null;
      })
      .filter((s): s is { id: string; desc: boolean } => !!s);
  }, [sortOpt]);

  const initialSizes = useMemo<ColumnSizingState>(() => {
    const sizes = autoSizeColumns(inputColumns, rows, groupBy);
    // Author-specified widths win over auto-size (user resizing still
    // wins over both because TanStack's columnSizing state layers on top).
    if (widths) {
      for (const [key, px] of Object.entries(widths)) {
        if (Number.isFinite(px) && px > 0) sizes[key] = px;
      }
    }
    return sizes;
  }, [inputColumns, rows, groupBy, widths]);

  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>(initialVisibility);
  const [columnSizing, setColumnSizing] =
    useState<ColumnSizingState>(initialSizes);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [density, setDensity] = useState<Density>(densityOpt ?? "comfy");
  const [grouping, setGrouping] = useState<GroupingState>(
    groupBy ? [groupBy] : [],
  );
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [focusedRow, setFocusedRow] = useState<number>(-1);
  const [focusedCol, setFocusedCol] = useState<number>(-1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Escape key exits fullscreen.
  useEffect(() => {
    if (!fullscreen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [fullscreen]);

  useEffect(() => {
    let cancelled = false;
    // URL-sync wins over StorageAdapter when both are present — shared
    // links should be reproducible.
    const url = urlSync ? readUrlState() : null;
    const apply = (s: Partial<PersistedState> | null) => {
      if (!s) return;
      if (s.sorting) setSorting(s.sorting);
      if (s.columnFilters) setColumnFilters(s.columnFilters);
      if (s.columnVisibility) setColumnVisibility(s.columnVisibility);
      // Only trust cached column sizes when the blob's schema version
      // matches current. Older blobs predate the canvas-measured
      // auto-size so their widths are too narrow for group labels etc.
      if (s.columnSizing && s._v === PERSIST_VERSION) {
        setColumnSizing((prev) => ({ ...prev, ...s.columnSizing }));
      }
      if (s.density) setDensity(s.density);
      if (s.grouping) setGrouping(s.grouping);
      if (s.expanded !== undefined) setExpanded(s.expanded);
      if (s.globalFilter) setGlobalFilter(s.globalFilter);
    };
    if (!storage || !storageKey) {
      apply(url);
      setHydrated(true);
      return;
    }
    storage.get<PersistedState>(`filemark:datagrid:${storageKey}`).then((s) => {
      if (cancelled) return;
      apply(s);
      apply(url); // url overrides
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [storage, storageKey, urlSync]);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      const state: PersistedState = {
        _v: PERSIST_VERSION,
        sorting,
        columnFilters,
        columnVisibility,
        columnSizing,
        density,
        grouping,
        expanded,
        globalFilter: globalFilter || undefined,
      };
      if (storage && storageKey) {
        void storage.set<PersistedState>(
          `filemark:datagrid:${storageKey}`,
          state,
        );
      }
      if (urlSync) writeUrlState(state);
    }, 250);
    return () => clearTimeout(t);
  }, [
    hydrated,
    storage,
    storageKey,
    urlSync,
    sorting,
    columnFilters,
    columnVisibility,
    columnSizing,
    density,
    grouping,
    expanded,
    globalFilter,
  ]);

  const colDefs = useMemo<ColumnDef<Row>[]>(() => {
    const base: ColumnDef<Row>[] = inputColumns.map((col) => {
      const isNumeric =
        col.type === "number" ||
        col.type === "currency" ||
        col.type === "percentage" ||
        col.type === "filesize" ||
        col.type === "progress" ||
        col.type === "rating";
      const family = filterFamilyFor(col.type);
      const aggFn = agg?.[col.key];
      return {
        id: col.key,
        accessorFn: (row: Row) => row[col.key],
        header: col.label,
        enableSorting: sortOpt !== false,
        enableColumnFilter: filter,
        enableResizing: true,
        enableGrouping: true,
        size: initialSizes[col.key] ?? DEFAULT_COL_WIDTH,
        minSize: MIN_COL_WIDTH,
        maxSize: 1600,
        filterFn: filterFns[family] as never,
        sortingFn: isNumeric ? "alphanumeric" : "auto",
        aggregationFn: aggFn ? AGG_FN_MAP[aggFn] : undefined,
        meta: { column: col, family },
        cell: (ctx) => {
          const rowId = idColumn
            ? coerceId(ctx.row.original[idColumn])
            : undefined;
          const colFilter = filterValueToTerm(ctx.column.getFilterValue());
          const gf = (ctx.table.getState().globalFilter as string) ?? "";
          const highlight = [gf, colFilter].filter(Boolean).join(" ");
          return (
            <CellRenderer
              value={ctx.getValue() as CellValue}
              column={col}
              rowId={rowId}
              storage={storage}
              storageKey={storageKey}
              highlight={highlight}
            />
          );
        },
        aggregatedCell: (ctx) => {
          if (!aggFn) return null;
          const v = ctx.getValue();
          if (v === null || v === undefined) return null;
          const n = typeof v === "number" ? v : Number(v);
          if (!Number.isFinite(n)) return null;
          const formatted = formatAgg(
            { fn: aggFn, value: n, contributing: ctx.row.subRows.length },
            col,
          );
          return (
            <span className="inline-flex items-baseline gap-1 text-[11px]">
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {formatted.label}
              </span>
              <span className="font-medium">{formatted.value}</span>
            </span>
          );
        },
      };
    });
    if (rowNumbers) {
      base.unshift({
        id: "_rowno",
        header: "#",
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: true,
        enableGrouping: false,
        size: ROWNO_COL_WIDTH,
        minSize: 40,
        maxSize: 120,
        meta: {
          column: {
            key: "_rowno",
            label: "#",
            type: "number",
            align: "right",
          } satisfies Column,
          family: "text" as FilterFamily,
        },
        cell: (ctx) =>
          ctx.row.getIsGrouped() ? null : (
            <span className="text-muted-foreground tabular-nums">
              {ctx.row.index + 1}
            </span>
          ),
      });
    }
    if (expandable) {
      base.unshift({
        id: "_expand",
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        enableGrouping: false,
        size: EXPAND_COL_WIDTH,
        minSize: EXPAND_COL_WIDTH,
        maxSize: EXPAND_COL_WIDTH,
        meta: {
          column: {
            key: "_expand",
            label: "",
            type: "string",
            align: "center",
          } satisfies Column,
          family: "text" as FilterFamily,
        },
        header: () => null,
        cell: ({ row }) =>
          row.getCanExpand() || row.getIsGrouped() ? (
            <button
              type="button"
              onClick={row.getToggleExpandedHandler()}
              className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground"
              aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
              aria-expanded={row.getIsExpanded()}
            >
              <svg
                viewBox="0 0 10 10"
                width="8"
                height="8"
                className={[
                  "transition-transform",
                  row.getIsExpanded() ? "rotate-90" : "",
                ].join(" ")}
                aria-hidden="true"
              >
                <path
                  d="M3 2 L7 5 L3 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null,
      });
    }
    if (selection) {
      base.unshift({
        id: "_select",
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        enableGrouping: false,
        size: SELECT_COL_WIDTH,
        minSize: SELECT_COL_WIDTH,
        maxSize: SELECT_COL_WIDTH,
        meta: {
          column: {
            key: "_select",
            label: "",
            type: "bool",
            align: "center",
          } satisfies Column,
          family: "text" as FilterFamily,
        },
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomeRowsSelected();
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="h-3.5 w-3.5 cursor-pointer accent-primary"
            aria-label="Select all"
          />
        ),
        cell: ({ row }) =>
          row.getIsGrouped() ? null : (
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              className="h-3.5 w-3.5 cursor-pointer accent-primary"
              aria-label="Select row"
            />
          ),
      });
    }
    return base;
  }, [
    inputColumns,
    filter,
    sortOpt,
    initialSizes,
    idColumn,
    storage,
    storageKey,
    rowNumbers,
    selection,
    expandable,
    agg,
  ]);

  const getRowId = useCallback(
    (row: Row, index: number): string =>
      idColumn && row[idColumn] !== null && row[idColumn] !== undefined
        ? String(row[idColumn])
        : String(index),
    [idColumn],
  );

  const table = useReactTable({
    data: rows,
    columns: colDefs,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      columnSizing,
      rowSelection,
      grouping,
      expanded,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    enableSortingRemoval: true,
    enableMultiSort: true,
    enableMultiRemove: true,
    enableColumnResizing: true,
    enableRowSelection: !!selection,
    enableGrouping: true,
    enableExpanding: true,
    getRowCanExpand: () => !!expandable,
    getSubRows: undefined,
    columnResizeMode: "onChange",
    globalFilterFn: "includesString",
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const tableRows = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const rowHeight = DENSITY[density].row;
  const rowPy = DENSITY[density].cellPy;
  const fontPx = DENSITY[density].fontPx;

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  const visibleLeafHeaders = useMemo(
    () =>
      table
        .getHeaderGroups()
        .at(-1)
        ?.headers.filter((h) => h.column.getIsVisible()) ?? [],
    // getHeaderGroups identity changes per render; force recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, columnVisibility, columnSizing, colDefs],
  );

  const gridTemplate = visibleLeafHeaders
    .map((h) => `${h.getSize()}px`)
    .join(" ");
  const totalWidth = visibleLeafHeaders.reduce(
    (sum, h) => sum + h.getSize(),
    0,
  );

  // Compute cumulative left offset for each pinned column (in the order
  // they appear visually in the grid, *not* the order in `freeze`).
  const freezeSet = useMemo(() => new Set(freeze), [freeze]);
  const pinnedLefts = useMemo(() => {
    const out = new Map<string, number>();
    let cumulative = 0;
    // Implicit pins: _select + _rowno always stick (they're UI columns).
    for (const h of visibleLeafHeaders) {
      const id = h.column.id;
      const pinned = id === "_select" || id === "_rowno" || freezeSet.has(id);
      if (pinned) {
        out.set(id, cumulative);
        cumulative += h.getSize();
      }
    }
    return out;
  }, [visibleLeafHeaders, freezeSet]);

  const pinStyle = (colId: string, zHeader = false): CSSProperties => {
    const left = pinnedLefts.get(colId);
    if (left === undefined) return {};
    return {
      position: "sticky",
      left,
      zIndex: zHeader ? 20 : 10,
    };
  };

  const totalCount = rows.length;
  const shownCount = tableRows.length;
  const contentHeight = rowVirtualizer.getTotalSize();
  const scrollHeight = height ?? 420;

  const hasAnyFilter =
    columnFilters.length > 0 || globalFilter.trim().length > 0;
  const selectedCount = Object.keys(rowSelection).length;

  // Aggregation footer data (computed over currently-filtered rows so
  // the numbers reflect what the user sees, not the raw dataset).
  const filteredOriginals = useMemo(
    () => tableRows.map((r) => r.original),
    [tableRows],
  );
  const aggResults = useMemo(
    () => collectAggs(agg, inputColumns, filteredOriginals),
    [agg, inputColumns, filteredOriginals],
  );
  const hasFooter = aggResults.size > 0;

  // ── Keyboard nav ─────────────────────────────────────────────────────
  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      // Don't steal typing in an input / textarea.
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      const maxRow = tableRows.length - 1;
      const maxCol = visibleLeafHeaders.length - 1;
      let r = focusedRow === -1 ? 0 : focusedRow;
      let c = focusedCol === -1 ? 0 : focusedCol;
      let handled = true;
      switch (e.key) {
        case "ArrowDown":
          r = Math.min(maxRow, r + 1);
          break;
        case "ArrowUp":
          r = Math.max(0, r - 1);
          break;
        case "ArrowRight":
          c = Math.min(maxCol, c + 1);
          break;
        case "ArrowLeft":
          c = Math.max(0, c - 1);
          break;
        case "Home":
          if (e.ctrlKey || e.metaKey) r = 0;
          c = 0;
          break;
        case "End":
          if (e.ctrlKey || e.metaKey) r = maxRow;
          c = maxCol;
          break;
        case "PageDown":
          r = Math.min(maxRow, r + PAGE_JUMP);
          break;
        case "PageUp":
          r = Math.max(0, r - PAGE_JUMP);
          break;
        case "/":
          searchInputRef.current?.focus();
          break;
        case " ":
          if (selection && focusedRow >= 0 && tableRows[focusedRow]) {
            tableRows[focusedRow]!.toggleSelected();
          }
          break;
        default:
          handled = false;
      }
      if (handled) {
        e.preventDefault();
        setFocusedRow(r);
        setFocusedCol(c);
        if (e.key.startsWith("Arrow") || e.key.startsWith("Page") || e.key === "Home" || e.key === "End") {
          rowVirtualizer.scrollToIndex(r, { align: "auto" });
        }
      }
    },
    [
      tableRows,
      visibleLeafHeaders,
      focusedRow,
      focusedCol,
      selection,
      rowVirtualizer,
    ],
  );

  // ── Bulk copy handlers ──────────────────────────────────────────────
  const selectedRowsOriginal = useMemo(
    () =>
      table
        .getSelectedRowModel()
        .rows.map((r) => r.original),
    [table, rowSelection],
  );
  const visibleUserColumns = useMemo(
    () =>
      inputColumns.filter((c) => columnVisibility[c.key] !== false),
    [inputColumns, columnVisibility],
  );
  const copySelected = (format: "csv" | "md" | "json") => {
    const payload = formatRows(selectedRowsOriginal, visibleUserColumns, format);
    navigator.clipboard?.writeText(payload).catch(() => {});
  };

  const wrapperClass = fullscreen
    ? "not-prose fixed inset-4 z-50 flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card shadow-2xl"
    : "not-prose my-4 w-full overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm";

  return (
    <div className={wrapperClass} style={{ fontSize: fontPx }}>
      {fullscreen && (
        <div
          className="fixed inset-0 -z-10 bg-background/70 backdrop-blur-sm"
          onClick={() => setFullscreen(false)}
        />
      )}
      {/* toolbar */}
      <div className="group/toolbar flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-foreground/70 truncate text-[11.5px] font-medium tracking-tight">
            {title ?? "data"}
          </div>
          {selectedCount > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10.5px] font-semibold text-primary">
              {selectedCount} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {selectedCount > 0 && (
            <>
              <IconButton
                onClick={() => copySelected("csv")}
                title="Copy selected rows as CSV"
                icon={<IconCopy letters="CSV" />}
              />
              <IconButton
                onClick={() => copySelected("md")}
                title="Copy selected rows as Markdown"
                icon={<IconCopy letters="MD" />}
              />
              <IconButton
                onClick={() => copySelected("json")}
                title="Copy selected rows as JSON"
                icon={<IconCopy letters="{}" />}
              />
              <Separator />
            </>
          )}
          <IconButton
            onClick={() => {
              if (!hasAnyFilter) return;
              table.resetColumnFilters();
              setGlobalFilter("");
            }}
            title={
              hasAnyFilter
                ? "Clear all filters and search"
                : "No filters active"
            }
            icon={<IconClearFilter />}
            disabled={!hasAnyFilter}
          />
          <IconButton
            onClick={() => cycleDensity(density, setDensity)}
            title={`Density: ${density}. Click to cycle.`}
            icon={<IconDensity density={density} />}
          />
          <IconButton
            onClick={() =>
              exportJSON(
                tableRows.map((r) => r.original),
                visibleUserColumns,
                title,
              )
            }
            title="Download visible rows as JSON"
            icon={<IconDownload label="JSON" />}
          />
          <IconButton
            onClick={() =>
              exportMarkdown(
                tableRows.map((r) => r.original),
                visibleUserColumns,
                title,
              )
            }
            title="Download visible rows as a GFM markdown table"
            icon={<IconDownload label="MD" />}
          />
          {rawSource !== undefined && (
            <IconButton
              onClick={() => setShowRaw((v) => !v)}
              title={showRaw ? "Hide raw source" : "View raw markdown source"}
              icon={<IconCode active={showRaw} />}
              active={showRaw}
            />
          )}
          <IconButton
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? "Exit full screen (Esc)" : "Expand to full screen"}
            icon={<IconFullscreen active={fullscreen} />}
            active={fullscreen}
          />
          {search && (
            <input
              ref={searchInputRef}
              type="search"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="search… (/)"
              className="bg-background/80 placeholder:text-muted-foreground/60 ml-1 h-6 w-44 rounded-md border border-border/60 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring/60"
            />
          )}
        </div>
      </div>

      {/* raw-source panel */}
      {showRaw && rawSource !== undefined && (
        <div className="border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between border-b border-border/40 bg-muted/40 px-3 py-1 text-[10.5px] text-muted-foreground">
            <span className="font-mono">
              ```{rawLang ?? "csv"} {rawMeta ?? ""}
            </span>
            <button
              type="button"
              onClick={() => {
                const text = reconstructFence(rawSource, rawLang, rawMeta);
                navigator.clipboard?.writeText(text).catch(() => {});
              }}
              className="text-muted-foreground hover:text-foreground text-[10.5px] font-medium"
              title="Copy the full fenced block"
            >
              copy fence
            </button>
          </div>
          <pre className="max-h-72 overflow-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed whitespace-pre text-foreground/90">
            {rawSource}
          </pre>
          <div className="border-t border-border/40 bg-muted/40 px-3 py-1 font-mono text-[10.5px] text-muted-foreground">
            ```
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="relative overflow-auto outline-none"
        style={{ height: scrollHeight }}
        tabIndex={0}
        role="grid"
        aria-rowcount={tableRows.length}
        aria-colcount={visibleLeafHeaders.length}
        onKeyDown={onKeyDown}
      >
        <div style={{ width: Math.max(totalWidth, 0) || "100%" }}>
          {/* header */}
          <div
            className={
              stickyHeader
                ? "bg-muted/80 supports-[backdrop-filter]:backdrop-blur sticky top-0 z-10 grid"
                : "bg-muted/80 grid"
            }
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {visibleLeafHeaders.map((h) => {
              const meta = h.column.columnDef.meta as
                | { column: Column }
                | undefined;
              const align = meta?.column.align ?? "left";
              const sorted = h.column.getIsSorted();
              const sortIndex = h.column.getSortIndex();
              const isResizing = h.column.getIsResizing();
              const canSort = h.column.getCanSort();
              const canResize = h.column.getCanResize();
              const isMultiSort = sorting.length > 1 && sorted !== false;
              return (
                <div
                  key={h.id}
                  className={[
                    "group/col relative min-w-0 overflow-hidden border-b border-border/60 px-3 text-[11.5px] font-medium text-foreground/80 select-none",
                    DENSITY[density].cellPy,
                    freezeSet.has(h.column.id) ||
                    h.column.id === "_select" ||
                    h.column.id === "_rowno"
                      ? "bg-muted/90 supports-[backdrop-filter]:backdrop-blur shadow-[1px_0_0_0_hsl(var(--border)/0.6)]"
                      : "",
                  ].join(" ")}
                  style={{ textAlign: align, ...pinStyle(h.column.id, true) }}
                >
                  <button
                    type="button"
                    onClick={h.column.getToggleSortingHandler()}
                    disabled={!canSort}
                    className={[
                      "inline-flex items-center gap-1 transition-colors",
                      canSort
                        ? "hover:text-foreground cursor-pointer"
                        : "cursor-default",
                    ].join(" ")}
                    title={
                      canSort
                        ? "Click to sort · shift-click to add a secondary sort"
                        : undefined
                    }
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {canSort && (
                      <>
                        <SortIndicator
                          direction={sorted || false}
                          highlight={!!sorted}
                        />
                        {isMultiSort && (
                          <span className="text-[9px] font-semibold text-primary tabular-nums">
                            {sortIndex + 1}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                  {canResize && (
                    <div
                      onMouseDown={h.getResizeHandler()}
                      onTouchStart={h.getResizeHandler()}
                      onDoubleClick={() =>
                        fitColumnToContent(h.column.id, inputColumns, rows, setColumnSizing)
                      }
                      role="separator"
                      aria-orientation="vertical"
                      aria-label="Resize column · double-click to fit content"
                      title="Drag to resize · double-click to fit column to content"
                      className={[
                        "absolute top-1.5 bottom-1.5 right-0 w-px cursor-col-resize touch-none select-none",
                        "bg-border transition-all",
                        "hover:w-[3px] hover:-mr-px hover:bg-primary/70",
                        isResizing ? "w-[3px] -mr-px !bg-primary" : "",
                      ].join(" ")}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* filter row */}
          {filter && (
            <div
              className="grid border-b border-border/50 bg-background/30"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {visibleLeafHeaders.map((h) => {
                const canFilter = h.column.getCanFilter();
                const meta = h.column.columnDef.meta as
                  | { column: Column; family: FilterFamily }
                  | undefined;
                const family: FilterFamily = meta?.family ?? "text";
                return (
                  <div
                    key={`f-${h.id}`}
                    className={[
                      "min-w-0 overflow-hidden px-1.5 py-1",
                      freezeSet.has(h.column.id) ||
                      h.column.id === "_select" ||
                      h.column.id === "_rowno" ||
                      h.column.id === "_expand"
                        ? "bg-background/60 supports-[backdrop-filter]:backdrop-blur"
                        : "",
                    ].join(" ")}
                    style={pinStyle(h.column.id)}
                  >
                    {canFilter && meta ? (
                      <ColumnFilterInput
                        column={meta.column}
                        family={family}
                        value={h.column.getFilterValue()}
                        onChange={(v) => h.column.setFilterValue(v)}
                        allRows={rows}
                      />
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* body */}
          <div style={{ height: contentHeight, position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const row = tableRows[vi.index]!;
              const zebra = vi.index % 2 === 1;
              const isFocused = vi.index === focusedRow;
              const isSelected = row.getIsSelected();
              const isGroup = row.getIsGrouped();
              const isExpanded = row.getIsExpanded();
              const depth = row.depth;
              const showDetail = isExpanded && !isGroup && expandable;
              return (
                <div
                  key={row.id}
                  data-index={vi.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 right-0"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  <div
                    role="row"
                    aria-selected={isSelected}
                    aria-level={depth + 1}
                    aria-expanded={
                      row.getCanExpand() || isGroup ? isExpanded : undefined
                    }
                    className={[
                      "group/row grid transition-colors border-b border-border/40",
                      isGroup
                        ? "bg-muted/60"
                        : isSelected
                          ? "bg-primary/10"
                          : zebra
                            ? "bg-muted/20"
                            : "bg-transparent",
                      !isGroup ? "hover:!bg-accent/50" : "",
                      isFocused ? "ring-1 ring-ring/60 ring-inset z-[1]" : "",
                    ].join(" ")}
                    style={{ gridTemplateColumns: gridTemplate }}
                  >
                    {row.getVisibleCells().map((cell, cellIdx) => {
                      const meta = cell.column.columnDef.meta as
                        | { column: Column; family: FilterFamily }
                        | undefined;
                      const align = meta?.column.align ?? "left";
                      const isFrozen =
                        freezeSet.has(cell.column.id) ||
                        cell.column.id === "_select" ||
                        cell.column.id === "_rowno" ||
                        cell.column.id === "_expand";
                      const colFocus = isFocused && focusedCol === cellIdx;
                      const isGroupCol =
                        isGroup && cell.column.id === row.groupingColumnId;
                      const isAggCell =
                        isGroup && cell.getIsAggregated();
                      return (
                        <div
                          key={cell.id}
                          role="gridcell"
                          style={{
                            textAlign: align,
                            ...pinStyle(cell.column.id),
                          }}
                          className={[
                            "min-w-0 overflow-hidden px-3 align-middle leading-snug",
                            // Group rows stay one line — keeps the header row
                            // compact and the grid uniform. Leaf rows can wrap
                            // if content is long.
                            isGroup ? "truncate whitespace-nowrap" : "break-words",
                            rowPy,
                            isFrozen
                              ? isGroup
                                ? "bg-muted/80 supports-[backdrop-filter]:backdrop-blur"
                                : isSelected
                                  ? "bg-primary/10 supports-[backdrop-filter]:backdrop-blur"
                                  : zebra
                                    ? "bg-muted/40 supports-[backdrop-filter]:backdrop-blur"
                                    : "bg-card/95 supports-[backdrop-filter]:backdrop-blur"
                              : "",
                            colFocus
                              ? "outline outline-1 outline-ring/60 outline-offset-[-1px]"
                              : "",
                            isGroup ? "font-semibold" : "",
                          ].join(" ")}
                        >
                          {isGroupCol ? (
                            <GroupLabel
                              row={row}
                              depth={depth}
                              label={String(cell.getValue() ?? "")}
                              count={row.subRows.length}
                            />
                          ) : isAggCell ? (
                            flexRender(
                              cell.column.columnDef.aggregatedCell,
                              cell.getContext(),
                            )
                          ) : isGroup ? null : (
                            flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {showDetail && (
                    <DetailPanel
                      row={row}
                      columns={inputColumns}
                      visibility={columnVisibility}
                    />
                  )}
                </div>
              );
            })}
            {!tableRows.length && (
              <div className="text-muted-foreground/80 w-full px-3 py-8 text-center text-xs italic">
                no matching rows
              </div>
            )}
          </div>

          {/* aggregation footer */}
          {hasFooter && (
            <div
              className="sticky bottom-0 z-10 grid border-t border-border/60 bg-muted/70 supports-[backdrop-filter]:backdrop-blur"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {visibleLeafHeaders.map((h) => {
                const agg = aggResults.get(h.column.id);
                const meta = h.column.columnDef.meta as
                  | { column: Column }
                  | undefined;
                const align = meta?.column.align ?? "left";
                const isFrozen =
                  freezeSet.has(h.column.id) ||
                  h.column.id === "_select" ||
                  h.column.id === "_rowno";
                return (
                  <div
                    key={`foot-${h.id}`}
                    className={[
                      "min-w-0 overflow-hidden px-3 text-[11px] tabular-nums",
                      rowPy,
                      isFrozen
                        ? "bg-muted/90 supports-[backdrop-filter]:backdrop-blur"
                        : "",
                    ].join(" ")}
                    style={{ textAlign: align, ...pinStyle(h.column.id) }}
                  >
                    {agg ? (
                      <span className="inline-flex items-baseline gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                          {formatAgg(agg.result, agg.column).label}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatAgg(agg.result, agg.column).value}
                        </span>
                      </span>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="text-muted-foreground/80 flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-1 text-[11px] tabular-nums">
        <span>
          {shownCount === totalCount
            ? `${totalCount} row${totalCount === 1 ? "" : "s"}`
            : `${shownCount} of ${totalCount} row${totalCount === 1 ? "" : "s"}`}
          {sorting.length > 1 && (
            <span className="ml-2 text-primary/80">
              · {sorting.length}-col sort
            </span>
          )}
        </span>
        <span className="flex items-center gap-3">
          {hasAnyFilter && <span className="text-primary/80">filtered</span>}
          <span className="hidden sm:inline opacity-70">
            ↑↓ ← → nav · / search · space select · ⌘Home/End
          </span>
        </span>
      </div>
    </div>
  );
}

function SortIndicator({
  direction,
  highlight,
}: {
  direction: "asc" | "desc" | false;
  highlight: boolean;
}) {
  return (
    <svg
      width="9"
      height="11"
      viewBox="0 0 9 11"
      className={[
        "shrink-0 transition-opacity",
        highlight
          ? "opacity-100 text-primary"
          : "opacity-25 group-hover/col:opacity-60",
      ].join(" ")}
      aria-hidden="true"
    >
      <path
        d="M4.5 1 L1.5 4 H7.5 Z"
        fill={direction === "asc" ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 10 L1.5 7 H7.5 Z"
        fill={direction === "desc" ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface PersistedState {
  /** Schema version. Bump when a breaking change (e.g. new auto-size
   *  heuristic) means cached state should NOT be loaded. Older blobs
   *  lacking `_v` are treated as v1 and their `columnSizing` is
   *  discarded so the fresh auto-size wins. */
  _v?: number;
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  columnVisibility?: VisibilityState;
  columnSizing?: ColumnSizingState;
  density?: Density;
  grouping?: GroupingState;
  expanded?: ExpandedState;
  globalFilter?: string;
}

const PERSIST_VERSION = 2;

function GroupLabel({
  row,
  depth,
  label,
  count,
}: {
  row: { getToggleExpandedHandler: () => () => void; getIsExpanded: () => boolean };
  depth: number;
  label: string;
  count: number;
}) {
  const isExpanded = row.getIsExpanded();
  return (
    <button
      type="button"
      onClick={row.getToggleExpandedHandler()}
      className="group/gl flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded -mx-1 px-1 py-0.5 text-left hover:bg-accent/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/60"
      style={{ paddingLeft: depth * 12 + 4 }}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? "Collapse group" : "Expand group"}
    >
      <svg
        viewBox="0 0 10 10"
        width="10"
        height="10"
        className={[
          "shrink-0 text-muted-foreground transition-transform group-hover/gl:text-foreground",
          isExpanded ? "rotate-90" : "",
        ].join(" ")}
        aria-hidden="true"
      >
        <path
          d="M3 2 L7 5 L3 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="min-w-0 flex-1 truncate">
        {label || <em className="text-muted-foreground/60">(empty)</em>}
      </span>
      <span className="shrink-0 text-[10px] font-normal text-muted-foreground/70 tabular-nums">
        {count}
      </span>
    </button>
  );
}

function DetailPanel({
  row,
  columns,
  visibility,
}: {
  row: { original: Row };
  columns: Column[];
  visibility: VisibilityState;
}) {
  const visible = columns.filter((c) => visibility[c.key] !== false);
  return (
    <div className="bg-muted/10 border-b border-border/40 px-4 py-3">
      <dl className="grid gap-x-4 gap-y-1.5 text-[11.5px]" style={{ gridTemplateColumns: "max-content 1fr" }}>
        {visible.map((col) => {
          const v = row.original[col.key];
          const display =
            v === null || v === undefined || v === "" ? (
              <span className="italic text-muted-foreground/50">—</span>
            ) : (
              <CellRenderer value={v} column={col} />
            );
          return (
            <div key={col.key} className="contents">
              <dt className="text-muted-foreground/70 text-[10.5px] uppercase tracking-wider font-semibold self-center">
                {col.label}
              </dt>
              <dd className="break-words">{display}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/**
 * Extract a short highlight term from a (now possibly typed) column-filter
 * value. Only string filters contribute to highlight; numeric / date / multi /
 * bool filters would overhighlight unrelated text.
 */
function filterValueToTerm(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function autoSizeColumns(
  cols: Column[],
  rows: Row[],
  groupBy?: string,
): ColumnSizingState {
  const sample = rows.slice(0, WIDTH_SAMPLE_ROWS);
  const sizing: ColumnSizingState = {};
  for (const col of cols) {
    const measured = measureColumnWidth(col, sample);
    // A grouped column needs extra room for the chevron (~12 px) + gap
    // + count badge (up to 3 digits ~22 px) + internal button padding.
    // ~60 px keeps "North (999)" intact for any reasonable row count.
    const extra = groupBy === col.key ? 60 : 0;
    sizing[col.key] = Math.max(
      MIN_COL_WIDTH,
      Math.min(MAX_COL_WIDTH, measured + extra),
    );
  }
  return sizing;
}

function cycleDensity(d: Density, set: (d: Density) => void) {
  const order: Density[] = ["compact", "comfy", "relaxed"];
  const next = order[(order.indexOf(d) + 1) % order.length]!;
  set(next);
}

function exportJSON(rows: Row[], cols: Column[], title?: string) {
  const projected = rows.map((r) => {
    const out: Record<string, CellValue> = {};
    for (const c of cols) out[c.key] = r[c.key] ?? null;
    return out;
  });
  const blob = new Blob([JSON.stringify(projected, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, `${safeFilename(title)}.json`);
}

function exportMarkdown(rows: Row[], cols: Column[], title?: string) {
  const out = formatRows(rows, cols, "md", title);
  const blob = new Blob([out], { type: "text/markdown" });
  downloadBlob(blob, `${safeFilename(title)}.md`);
}

function formatRows(
  rows: Row[],
  cols: Column[],
  format: "csv" | "md" | "json",
  title?: string,
): string {
  if (format === "json") {
    const projected = rows.map((r) => {
      const out: Record<string, CellValue> = {};
      for (const c of cols) out[c.key] = r[c.key] ?? null;
      return out;
    });
    return JSON.stringify(projected, null, 2);
  }
  if (format === "csv") {
    const header = cols.map((c) => escapeCsv(c.label)).join(",");
    const body = rows
      .map((r) =>
        cols
          .map((c) => {
            const v = r[c.key];
            return escapeCsv(
              v === null || v === undefined ? "" : String(v),
            );
          })
          .join(","),
      )
      .join("\n");
    return `${header}\n${body}\n`;
  }
  // md
  const header = "| " + cols.map((c) => escapeCell(c.label)).join(" | ") + " |";
  const sep =
    "| " +
    cols
      .map((c) =>
        c.align === "right"
          ? "---:"
          : c.align === "center"
            ? ":---:"
            : "---",
      )
      .join(" | ") +
    " |";
  const body = rows
    .map(
      (r) =>
        "| " +
        cols
          .map((c) =>
            escapeCell(
              r[c.key] === null || r[c.key] === undefined
                ? ""
                : String(r[c.key]),
            ),
          )
          .join(" | ") +
        " |",
    )
    .join("\n");
  return `${title ? `# ${title}\n\n` : ""}${header}\n${sep}\n${body}\n`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCell(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function escapeCsv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function safeFilename(title?: string): string {
  const base = (title ?? "data").trim() || "data";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+|^-|-$/g, "-");
}

function coerceId(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v);
  return s || undefined;
}

/* ── toolbar icons + button ────────────────────────────────────────── */

function IconButton({
  onClick,
  title,
  icon,
  active = false,
  disabled = false,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={[
        "inline-flex h-6 min-w-[24px] items-center justify-center gap-1 rounded-md px-1.5 text-[10.5px] font-medium transition-opacity transition-colors",
        disabled
          ? "text-muted-foreground/40 cursor-not-allowed opacity-40"
          : active
            ? "bg-primary/15 text-primary opacity-100"
            : "text-muted-foreground opacity-60 hover:bg-accent/60 hover:text-foreground hover:opacity-100 group-hover/toolbar:opacity-100",
      ].join(" ")}
    >
      {icon}
    </button>
  );
}

function Separator() {
  return <span className="mx-1 h-4 w-px bg-border/60" aria-hidden="true" />;
}

function IconCopy({ letters }: { letters: string }) {
  return (
    <>
      <svg viewBox="0 0 14 14" width="11" height="11" aria-hidden="true" className="shrink-0">
        <rect x="3" y="1" width="9" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <rect x="1.5" y="3" width="9" height="10" rx="1.5" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.1" />
      </svg>
      <span className="font-mono text-[9px] font-semibold tracking-tight">{letters}</span>
    </>
  );
}

function IconDownload({ label }: { label: string }) {
  return (
    <>
      <svg viewBox="0 0 14 14" width="11" height="11" aria-hidden="true" className="shrink-0">
        <path d="M7 2 L7 9 M4 6.5 L7 9.5 L10 6.5 M2.5 11.5 L11.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-mono text-[9px] font-semibold tracking-tight">{label}</span>
    </>
  );
}

function IconDensity({ density }: { density: Density }) {
  const gap = density === "compact" ? 1.5 : density === "comfy" ? 2.5 : 3.5;
  const ys = [2, 2 + gap, 2 + gap * 2, 2 + gap * 3];
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      {ys.map((y, i) => (
        <line
          key={i}
          x1="1.5"
          y1={y}
          x2="10.5"
          y2={y}
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function IconFullscreen({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
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
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path
        d="M1 4 L1 1 L4 1 M8 1 L11 1 L11 4 M1 8 L1 11 L4 11 M8 11 L11 11 L11 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClearFilter() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path
        d="M1.5 2.5 H10.5 L7.5 6 V10 L4.5 8.5 V6 L1.5 2.5 Z M9 8.5 L11 10.5 M11 8.5 L9 10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCode({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path
        d="M4 3 L1.5 6 L4 9 M8 3 L10.5 6 L8 9"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 1.5 : 1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── resize / fit helpers ──────────────────────────────────────────── */

/**
 * Widen (or narrow) a column to fit the longest sampled content without
 * wrapping. Measures actual pixel width via an offscreen canvas so
 * proportional fonts (and bold headers, wide characters, emoji) size
 * accurately — the previous char-count × 7.5 heuristic under-counted
 * for mixed content.
 */
function fitColumnToContent(
  colId: string,
  inputColumns: Column[],
  rows: Row[],
  setColumnSizing: (
    updater: (prev: ColumnSizingState) => ColumnSizingState,
  ) => void,
) {
  const col = inputColumns.find((c) => c.key === colId);
  if (!col) return;
  const px = measureColumnWidth(col, rows);
  setColumnSizing((prev) => ({ ...prev, [colId]: px }));
}

let measureCanvas: HTMLCanvasElement | null = null;

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  return measureCanvas.getContext("2d");
}

function measureColumnWidth(col: Column, rows: Row[]): number {
  const ctx = getMeasureCtx();
  if (!ctx) {
    // Fallback to char heuristic when canvas isn't available (SSR / tests).
    let longest = col.label.length;
    for (const r of rows) {
      const v = r[col.key];
      if (v === null || v === undefined) continue;
      const s = String(v);
      const firstLine =
        s.indexOf("\n") === -1 ? s : s.slice(0, s.indexOf("\n"));
      if (firstLine.length > longest) longest = firstLine.length;
    }
    return Math.max(MIN_COL_WIDTH, Math.round(longest * PX_PER_CHAR + 40));
  }
  const fontStack =
    '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  // Header is semibold — approximate by measuring with a slightly wider font.
  ctx.font = `600 ${fontStack}`;
  let maxPx = ctx.measureText(col.label).width;
  ctx.font = fontStack;
  for (const r of rows) {
    const v = r[col.key];
    if (v === null || v === undefined) continue;
    const s = String(v);
    const firstLine =
      s.indexOf("\n") === -1 ? s : s.slice(0, s.indexOf("\n"));
    const w = ctx.measureText(firstLine).width;
    if (w > maxPx) maxPx = w;
  }
  // Horizontal cell padding (`px-3` = 24 px) + header sort indicator & ordinal
  // (~28 px) + a small safety buffer so ascender/descender, italics, emoji and
  // stacked icons never clip.
  return Math.max(MIN_COL_WIDTH, Math.round(maxPx + 48));
}

function reconstructFence(
  source: string,
  lang: string | undefined,
  meta: string | undefined,
): string {
  const head = ["```" + (lang ?? "csv"), meta ?? ""].filter(Boolean).join(" ");
  const body = source.replace(/\n$/, "");
  return `${head}\n${body}\n\`\`\`\n`;
}
