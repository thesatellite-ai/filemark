import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Treemap — nested rectangles sized by value.
 *
 *     <Treemap height="320">
 *     name,value,group
 *     React,4500,frontend
 *     Vue,2100,frontend
 *     Svelte,900,frontend
 *     Express,3200,backend
 *     Fastify,1100,backend
 *     </Treemap>
 *
 * Or pass `src=` to a CSV file (chrome-ext fetches via FSA / network).
 * Layout: simple squarified treemap. Tile colour cycles by group;
 * tiles smaller than ~30px hide their text.
 */
export function Treemap(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const src = asString(props.src);
  const heightProp = asString(props.height);
  const height = heightProp ? Number(heightProp) || 320 : 320;
  const inline = collectText(props.children).trim();
  const [csv, setCsv] = useState<string>("");
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (inline) {
      setCsv(inline);
      return;
    }
    if (!src || fetchedRef.current) return;
    fetchedRef.current = true;
    void fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setCsv)
      .catch(() => {});
  }, [src, inline]);

  const rows = parseCsv(csv);
  if (rows.length === 0) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>Treemap</strong> — no rows; pass inline `name,value` data
        or `src=` to a CSV.
      </div>
    );
  }

  const total = rows.reduce((s, r) => s + r.value, 0);
  const containerW = 600;
  const tiles = squarify(rows, total, containerW, height);
  const groups = Array.from(new Set(rows.map((r) => r.group)));
  const groupColor = (g: string): string => {
    const i = groups.indexOf(g);
    const palette = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
    ];
    return palette[Math.max(0, i) % palette.length];
  };

  return (
    <figure className="fv-treemap bg-card my-6 overflow-x-auto rounded-lg border p-3">
      <svg
        width={containerW}
        height={height}
        viewBox={`0 0 ${containerW} ${height}`}
        className="block max-w-full"
      >
        {tiles.map((t, i) => {
          const showText = t.w > 50 && t.h > 30;
          return (
            <g key={i} transform={`translate(${t.x}, ${t.y})`}>
              <rect
                width={t.w - 2}
                height={t.h - 2}
                fill={groupColor(t.group)}
                fillOpacity={0.85}
                rx={3}
                ry={3}
              >
                <title>{`${t.name} — ${t.value}${t.group ? ` (${t.group})` : ""}`}</title>
              </rect>
              {showText && (
                <>
                  <text
                    x={6}
                    y={16}
                    fill="white"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {t.name}
                  </text>
                  <text
                    x={6}
                    y={30}
                    fill="white"
                    fillOpacity={0.85}
                    fontSize="10"
                  >
                    {t.value}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

interface Row {
  name: string;
  value: number;
  group: string;
}

interface Tile extends Row {
  x: number;
  y: number;
  w: number;
  h: number;
}

function parseCsv(text: string): Row[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((c) => c.trim().toLowerCase());
  const nameIdx = Math.max(0, header.indexOf("name"));
  const valueIdx = Math.max(1, header.indexOf("value"));
  const groupIdx = header.indexOf("group");
  const dataStart =
    header.includes("name") || header.includes("value") ? 1 : 0;
  const out: Row[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    const name = cells[nameIdx];
    const value = Number(cells[valueIdx]);
    if (!name || Number.isNaN(value)) continue;
    out.push({
      name,
      value,
      group: groupIdx >= 0 ? cells[groupIdx] ?? "" : "",
    });
  }
  return out;
}

// Simple greedy slice-and-dice layout (not full squarify, but works
// fine at this scale).
function squarify(
  rows: Row[],
  total: number,
  width: number,
  height: number
): Tile[] {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const out: Tile[] = [];
  let x = 0;
  let y = 0;
  let remaining = width * height;

  // Slice into rows of ~3 tiles each.
  let row: Row[] = [];
  let rowSum = 0;
  const ROW_TARGET = Math.max(2, Math.ceil(Math.sqrt(sorted.length)));
  for (const r of sorted) {
    row.push(r);
    rowSum += r.value;
    if (row.length >= ROW_TARGET) {
      const rowArea = (rowSum / total) * (width * height);
      const rowH = Math.min(height - y, rowArea / width);
      let cx = 0;
      for (const item of row) {
        const w = (item.value / rowSum) * width;
        out.push({ ...item, x: x + cx, y, w, h: rowH });
        cx += w;
      }
      y += rowH;
      remaining -= rowArea;
      row = [];
      rowSum = 0;
    }
  }
  if (row.length > 0) {
    const rowH = Math.max(0, height - y);
    let cx = 0;
    for (const item of row) {
      const w = (item.value / Math.max(rowSum, 1)) * width;
      out.push({ ...item, x: x + cx, y, w, h: rowH });
      cx += w;
    }
  }
  return out;
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
