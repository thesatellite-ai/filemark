import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CellValue, Column, ColumnType, Row } from "./types";
import { TONE_CLASS, defaultStatusTone } from "./parseColumnType";
import { tagColorClass } from "./color-hash";

/**
 * Filter-family decides the UI + the filterFn used for a column.
 * `text` is the fallback (current behavior — plain substring).
 */
export type FilterFamily =
  | "text"
  | "number-range"
  | "date-range"
  | "multi-select"
  | "bool-tristate";

export function filterFamilyFor(type: ColumnType): FilterFamily {
  switch (type) {
    case "number":
    case "currency":
    case "percentage":
    case "progress":
    case "filesize":
    case "rating":
      return "number-range";
    case "date":
    case "relative":
      return "date-range";
    case "status":
      return "multi-select";
    case "tags":
      return "multi-select";
    case "bool":
    case "checkmark":
    case "checkbox":
      return "bool-tristate";
    default:
      return "text";
  }
}

/* ── filterFn implementations (for TanStack Table) ─────────────────── */

type FilterFn<T = Row> = (
  row: { getValue: (id: string) => unknown; original: T },
  columnId: string,
  filterValue: unknown,
) => boolean;

export const filterFns: Record<FilterFamily, FilterFn> = {
  text: (row, columnId, filterValue) => {
    if (!filterValue) return true;
    const s = String(row.getValue(columnId) ?? "").toLowerCase();
    return s.includes(String(filterValue).toLowerCase());
  },
  "number-range": (row, columnId, filterValue) => {
    if (!Array.isArray(filterValue)) return true;
    const [min, max] = filterValue as [number | null, number | null];
    if (min === null && max === null) return true;
    const raw = row.getValue(columnId);
    const n =
      typeof raw === "number"
        ? raw
        : Number(String(raw ?? "").replace(/[$,%\s_]/g, ""));
    if (!Number.isFinite(n)) return false;
    if (min !== null && n < min) return false;
    if (max !== null && n > max) return false;
    return true;
  },
  "date-range": (row, columnId, filterValue) => {
    if (!Array.isArray(filterValue)) return true;
    const [from, to] = filterValue as [string | null, string | null];
    if (!from && !to) return true;
    const raw = row.getValue(columnId);
    const t = Date.parse(String(raw ?? ""));
    if (Number.isNaN(t)) return false;
    if (from) {
      const f = Date.parse(from);
      if (!Number.isNaN(f) && t < f) return false;
    }
    if (to) {
      const e = Date.parse(to);
      if (!Number.isNaN(e) && t > e + 86_400_000 - 1) return false;
    }
    return true;
  },
  "multi-select": (row, columnId, filterValue) => {
    if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
    const raw = row.getValue(columnId);
    if (raw === null || raw === undefined) return false;
    // tags split
    const s = String(raw);
    const parts = s.split(",").map((t) => t.trim());
    const set = new Set((filterValue as string[]).map((v) => v.toLowerCase()));
    return parts.some((p) => set.has(p.toLowerCase()));
  },
  "bool-tristate": (row, columnId, filterValue) => {
    if (filterValue === null || filterValue === undefined) return true;
    const want = filterValue as boolean;
    const raw = row.getValue(columnId);
    const got =
      raw === true ||
      /^(true|yes|1|y)$/i.test(String(raw ?? ""));
    return got === want;
  },
};

/* ── per-family filter UI components ───────────────────────────────── */

export function ColumnFilterInput({
  column,
  family,
  value,
  onChange,
  allRows,
}: {
  column: Column;
  family: FilterFamily;
  value: unknown;
  onChange: (v: unknown) => void;
  allRows: Row[];
}) {
  if (family === "number-range") {
    const v = (Array.isArray(value) ? value : [null, null]) as [
      number | null,
      number | null,
    ];
    return (
      <div className="flex min-w-0 items-center gap-0.5">
        <input
          type="number"
          value={v[0] ?? ""}
          onChange={(e) =>
            onChange([
              e.target.value === "" ? null : Number(e.target.value),
              v[1],
            ])
          }
          placeholder="min"
          className="placeholder:text-muted-foreground/50 h-6 min-w-0 flex-1 rounded-md border border-border/50 bg-background/80 px-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/60"
        />
        <input
          type="number"
          value={v[1] ?? ""}
          onChange={(e) =>
            onChange([
              v[0],
              e.target.value === "" ? null : Number(e.target.value),
            ])
          }
          placeholder="max"
          className="placeholder:text-muted-foreground/50 h-6 min-w-0 flex-1 rounded-md border border-border/50 bg-background/80 px-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/60"
        />
      </div>
    );
  }

  if (family === "date-range") {
    const v = (Array.isArray(value) ? value : [null, null]) as [
      string | null,
      string | null,
    ];
    return (
      <div className="flex min-w-0 items-center gap-0.5">
        <input
          type="date"
          value={v[0] ?? ""}
          onChange={(e) => onChange([e.target.value || null, v[1]])}
          className="h-6 min-w-0 flex-1 rounded-md border border-border/50 bg-background/80 px-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/60"
        />
        <input
          type="date"
          value={v[1] ?? ""}
          onChange={(e) => onChange([v[0], e.target.value || null])}
          className="h-6 min-w-0 flex-1 rounded-md border border-border/50 bg-background/80 px-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/60"
        />
      </div>
    );
  }

  if (family === "multi-select") {
    return (
      <MultiSelectFilter
        column={column}
        value={Array.isArray(value) ? (value as string[]) : []}
        onChange={onChange as (v: string[]) => void}
        allRows={allRows}
      />
    );
  }

  if (family === "bool-tristate") {
    const state: "any" | "yes" | "no" =
      value === true ? "yes" : value === false ? "no" : "any";
    const cycle = () => {
      if (state === "any") onChange(true);
      else if (state === "yes") onChange(false);
      else onChange(null);
    };
    return (
      <button
        type="button"
        onClick={cycle}
        className={[
          "h-6 w-full rounded-md border border-border/50 bg-background/80 px-2 text-[11px] font-medium transition-colors",
          state === "yes"
            ? "text-emerald-600 dark:text-emerald-300"
            : state === "no"
              ? "text-red-600 dark:text-red-300"
              : "text-muted-foreground",
        ].join(" ")}
        title="Cycle: any → yes → no → any"
      >
        {state === "any" ? "any" : state === "yes" ? "✓ yes" : "✗ no"}
      </button>
    );
  }

  // default: text
  return (
    <input
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="filter…"
      className="placeholder:text-muted-foreground/50 h-6 w-full rounded-md border border-border/50 bg-background/80 px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/60"
    />
  );
}

/* ── multi-select dropdown with distinct values sampled from data ─── */

function MultiSelectFilter({
  column,
  value,
  onChange,
  allRows,
}: {
  column: Column;
  value: string[];
  onChange: (v: string[]) => void;
  allRows: Row[];
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) {
      const raw = r[column.key];
      if (raw === null || raw === undefined || raw === "") continue;
      const s = String(raw);
      if (column.type === "tags") {
        for (const t of s.split(",").map((x) => x.trim()).filter(Boolean)) {
          set.add(t);
        }
      } else {
        set.add(s);
      }
    }
    return Array.from(set).sort();
  }, [allRows, column.key, column.type]);

  const openMenu = () => {
    if (buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setAnchor({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(true);
  };

  // Outside-click + scroll + escape dismiss. Dropdown is fixed-positioned
  // so we close-on-scroll to avoid drift. Clicks inside the popover don't
  // count as "outside" (checked via popoverRef.contains). The trigger
  // button also doesn't count (so its own onClick can still toggle).
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (popoverRef.current?.contains(t)) return;
      if (buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const toggle = (opt: string) => {
    const next = value.includes(opt)
      ? value.filter((v) => v !== opt)
      : [...value, opt];
    onChange(next);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={[
          "h-6 w-full rounded-md border border-border/50 bg-background/80 px-2 text-left text-[11px] transition-colors",
          value.length
            ? "text-foreground font-medium"
            : "text-muted-foreground/70",
        ].join(" ")}
      >
        {value.length === 0
          ? "any"
          : value.length === 1
            ? value[0]
            : `${value.length} selected`}
        <span className="float-right opacity-50">▾</span>
      </button>
      {open && anchor && (
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            top: anchor.top,
            left: anchor.left,
            minWidth: Math.max(anchor.width, 160),
            zIndex: 1000,
          }}
          className="max-h-56 overflow-auto rounded-md border border-border/60 bg-popover p-1 shadow-lg"
        >
          {options.length === 0 ? (
            <div className="px-2 py-1 text-[11px] italic text-muted-foreground">
              no values
            </div>
          ) : (
            options.map((opt) => (
              <MultiSelectRow
                key={opt}
                column={column}
                value={opt}
                selected={value.includes(opt)}
                onToggle={() => toggle(opt)}
              />
            ))
          )}
          {value.length > 0 && (
            <>
              <div className="my-1 h-px bg-border/50" />
              <button
                type="button"
                onClick={() => {
                  onChange([]);
                  setOpen(false);
                }}
                className="w-full rounded px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              >
                Clear selection
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function MultiSelectRow({
  column,
  value,
  selected,
  onToggle,
}: {
  column: Column;
  value: string;
  selected: boolean;
  onToggle: () => void;
}) {
  let chip: ReactNode = value;
  if (column.type === "status") {
    const override = column.args?.colors?.[value];
    const tone = override ?? defaultStatusTone(value);
    chip = (
      <span
        className={[
          "inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium",
          TONE_CLASS[tone],
        ].join(" ")}
      >
        <span className="h-1 w-1 rounded-full bg-current" />
        {value}
      </span>
    );
  } else if (column.type === "tags") {
    chip = (
      <span
        className={[
          "rounded-md border px-1.5 py-px text-[10px] font-medium",
          tagColorClass(value),
        ].join(" ")}
      >
        {value}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-[11px] hover:bg-accent/60"
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => {
          /* handled by parent button's onClick */
        }}
        tabIndex={-1}
        className="pointer-events-none h-3 w-3 accent-primary"
      />
      {chip}
    </button>
  );
}

// `CellValue` import kept for downstream consumers of this module.
export type _CellValue = CellValue;
