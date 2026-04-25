import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AssetResolver } from "@filemark/core";

/**
 * Heatmap — GitHub-style activity grid (53 weeks × 7 days).
 *
 *     <Heatmap src="./activity.csv" date="day" value="commits" title="2026 contributions" />
 *
 * CSV: at minimum a date column + a value column; pass `date=` and
 * `value=` to map. Year defaults to the latest year present; pass
 * `year="2025"` to pin.
 *
 * Inline data via children (one `date,value` line per row, with or
 * without a header):
 *
 *     <Heatmap title="Streak">
 *     2026-01-01,3
 *     2026-01-02,5
 *     …
 *     </Heatmap>
 */
export function Heatmap(
  props: Record<string, unknown> & { children?: ReactNode; assets?: AssetResolver }
) {
  const src = asString(props.src);
  const dateKey = asString(props.date) || "date";
  const valueKey = asString(props.value) || "value";
  const title = asString(props.title);
  const yearProp = asString(props.year);

  const [rows, setRows] = useState<{ date: Date; value: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // Inline children → text → rows (synchronous).
  const inline = collectText(props.children).trim();

  useEffect(() => {
    if (inline) {
      setRows(parseCsv(inline, dateKey, valueKey));
      return;
    }
    if (!src) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((text) => setRows(parseCsv(text, dateKey, valueKey)))
      .catch((e) => setError((e as Error).message));
  }, [src, inline, dateKey, valueKey]);

  if (error) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm text-rose-600">
        <strong>Heatmap</strong> — {error}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>Heatmap</strong> — no data; pass `src=` or inline rows.
      </div>
    );
  }

  // Pick year: explicit `year=` prop, else most recent year in data.
  const year = yearProp
    ? Number(yearProp)
    : Math.max(...rows.map((r) => r.date.getFullYear()));
  const grid = buildGrid(rows, year);
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <figure className="fv-heatmap bg-card my-6 overflow-hidden rounded-lg border p-4">
      {title && (
        <figcaption className="text-foreground mb-2 text-[13px] font-semibold">
          {title} <span className="text-muted-foreground font-normal">· {year}</span>
        </figcaption>
      )}
      <div className="overflow-x-auto">
        <svg
          width={53 * 13 + 30}
          height={7 * 13 + 16}
          className="block"
          aria-label={title || `Heatmap for ${year}`}
        >
          {/* Day-of-week labels on the left. */}
          {["Mon", "Wed", "Fri"].map((label, i) => (
            <text
              key={label}
              x={2}
              y={(i * 2 + 2) * 13 + 10}
              className="fill-muted-foreground"
              fontSize="9"
            >
              {label}
            </text>
          ))}
          <g transform="translate(28, 12)">
            {grid.map((week, w) =>
              week.map((cell, d) => (
                <rect
                  key={`${w}-${d}`}
                  x={w * 13}
                  y={d * 13}
                  width={11}
                  height={11}
                  rx={2}
                  ry={2}
                  fill={cellColor(cell.value, max)}
                >
                  <title>{`${cell.dateLabel} — ${cell.value}`}</title>
                </rect>
              ))
            )}
          </g>
        </svg>
      </div>
      <div className="text-muted-foreground mt-1 flex items-center justify-end gap-1 text-[10px]">
        Less
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <span
            key={f}
            className="inline-block size-2.5 rounded-sm"
            style={{ backgroundColor: cellColor(f * max, max) }}
          />
        ))}
        More
      </div>
    </figure>
  );
}

function cellColor(v: number, max: number): string {
  if (v <= 0) return "var(--muted)";
  const t = Math.min(1, v / max);
  // 5-step scale from primary/15 → primary/100 alpha.
  if (t < 0.25) return "color-mix(in oklab, var(--primary) 25%, transparent)";
  if (t < 0.5) return "color-mix(in oklab, var(--primary) 45%, transparent)";
  if (t < 0.75) return "color-mix(in oklab, var(--primary) 65%, transparent)";
  if (t < 1) return "color-mix(in oklab, var(--primary) 85%, transparent)";
  return "var(--primary)";
}

function buildGrid(
  rows: { date: Date; value: number }[],
  year: number
): { value: number; dateLabel: string }[][] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.date.getFullYear() !== year) continue;
    const key = isoDate(r.date);
    map.set(key, (map.get(key) ?? 0) + r.value);
  }
  // Build a 53-column × 7-row grid, columns = ISO weeks, rows = day-of-week.
  const start = new Date(year, 0, 1, 12);
  // Shift to the most recent Monday on or before Jan 1.
  const dayShift = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayShift);
  const weeks: { value: number; dateLabel: string }[][] = [];
  for (let w = 0; w < 53; w++) {
    const col: { value: number; dateLabel: string }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime());
      date.setDate(start.getDate() + w * 7 + d);
      const key = isoDate(date);
      col.push({
        value: map.get(key) ?? 0,
        dateLabel: date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      });
    }
    weeks.push(col);
  }
  return weeks;
}

function parseCsv(
  text: string,
  dateKey: string,
  valueKey: string
): { date: Date; value: number }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const headerCells = lines[0].split(",").map((c) => c.trim().toLowerCase());
  const looksLikeHeader =
    headerCells.includes(dateKey.toLowerCase()) ||
    headerCells.some((c) => c === "date" || c === "day");
  let dateIdx = 0;
  let valueIdx = 1;
  let dataStart = 0;
  if (looksLikeHeader) {
    dateIdx = headerCells.indexOf(dateKey.toLowerCase());
    valueIdx = headerCells.indexOf(valueKey.toLowerCase());
    if (dateIdx < 0) dateIdx = 0;
    if (valueIdx < 0) valueIdx = 1;
    dataStart = 1;
  }
  const out: { date: Date; value: number }[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    const ds = cells[dateIdx];
    const vs = cells[valueIdx];
    if (!ds) continue;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ds);
    if (!m) continue;
    const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
    const v = Number(vs);
    if (Number.isNaN(v)) continue;
    out.push({ date, value: v });
  }
  return out;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function collectText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    return collectText(
      (node as { props: { children?: ReactNode } }).props.children
    );
  }
  return "";
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
