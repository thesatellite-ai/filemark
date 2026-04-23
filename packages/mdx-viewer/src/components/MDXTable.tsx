import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type TableHTMLAttributes,
} from "react";

/**
 * Wraps a rendered markdown table with a horizontal-scroll container and
 * two hover-revealed chips:
 *
 *  ⚙ Options ▾  — per-table styling: density, sticky header, zebra,
 *                 column resize on/off.
 *  ⬇ Download ▾ — export the rendered table data as CSV / JSON / compact.
 *
 * Table data is read from the DOM on download so the export mirrors
 * what the user sees — inline markdown like links, code, and formatting
 * flatten to their textContent. Header cells become JSON keys.
 *
 * Resize mode enables `table-layout: fixed`, snapshots each column's
 * current width, and draws drag handles on each th. Widths live in
 * component state for now (per-session, per-table). Wiring these into
 * StorageAdapter for persistence is a follow-on.
 */

type Density = "compact" | "cozy" | "relaxed";

interface TableOpts {
  density: Density;
  sticky: boolean;
  zebra: boolean;
  resize: boolean;
  nowrap: boolean;
}

const DEFAULT_OPTS: TableOpts = {
  density: "cozy",
  sticky: false,
  zebra: false,
  resize: false,
  nowrap: false,
};

export function MDXTable(props: TableHTMLAttributes<HTMLTableElement>) {
  const outerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [opts, setOpts] = useState<TableOpts>(DEFAULT_OPTS);
  const [dlOpen, setDlOpen] = useState(false);
  const [optsOpen, setOptsOpen] = useState(false);
  const [widths, setWidths] = useState<number[] | null>(null);

  // When resize mode flips on, snapshot the current column widths so the
  // user's starting point is exactly what they see. When it flips off,
  // drop the snapshot so the table reflows naturally.
  useEffect(() => {
    if (!opts.resize) {
      setWidths(null);
      return;
    }
    const t = tableRef.current;
    if (!t) return;
    const firstRow = t.querySelector("tr");
    if (!firstRow) return;
    const cells = Array.from(firstRow.children) as HTMLElement[];
    setWidths(cells.map((c) => c.getBoundingClientRect().width));
  }, [opts.resize]);

  // Apply widths to every row's first cell positionally via inline style so
  // table-layout: fixed picks them up. Also pin the table's total width to
  // sum(widths) so dragging a column wider grows the table past the
  // container, letting the outer wrap's overflow-x kick in.
  useEffect(() => {
    const t = tableRef.current;
    if (!t) return;
    if (!opts.resize || !widths) {
      // Strip any inline widths we set earlier.
      t.style.removeProperty("width");
      t.style.removeProperty("min-width");
      const ths = Array.from(t.querySelectorAll("thead th")) as HTMLElement[];
      ths.forEach((c) => c.style.removeProperty("width"));
      return;
    }
    const headerCells = Array.from(
      t.querySelectorAll("thead th")
    ) as HTMLElement[];
    headerCells.forEach((c, i) => {
      const w = widths[i];
      if (w) c.style.width = `${w}px`;
    });
    const total = widths.reduce((s, w) => s + w, 0);
    t.style.width = `${total}px`;
    t.style.minWidth = `${total}px`;
  }, [widths, opts.resize]);

  const readTable = (): { headers: string[]; rows: string[][] } => {
    const t = tableRef.current;
    if (!t) return { headers: [], rows: [] };
    const headers = Array.from(t.querySelectorAll("thead th")).map((c) =>
      (c.textContent ?? "").trim()
    );
    const rows = Array.from(t.querySelectorAll("tbody tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td")).map((c) =>
        (c.textContent ?? "").trim()
      )
    );
    return { headers, rows };
  };

  const doDownload = (body: string, filename: string, mime: string) => {
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDlOpen(false);
  };

  const dlCsv = () => {
    const { headers, rows } = readTable();
    doDownload(toCSV(headers, rows), "table.csv", "text/csv");
  };
  const dlJson = () => {
    const { headers, rows } = readTable();
    const data = rowsToObjects(headers, rows);
    doDownload(
      JSON.stringify(data, null, 2),
      "table.json",
      "application/json"
    );
  };
  const dlJsonCompact = () => {
    const { headers, rows } = readTable();
    const data = rowsToObjects(headers, rows);
    doDownload(JSON.stringify(data), "table.min.json", "application/json");
  };

  const setDensity = (d: Density) => setOpts((o) => ({ ...o, density: d }));
  const toggle = (k: keyof TableOpts) =>
    setOpts((o) => ({ ...o, [k]: !o[k] }));

  // Column resize: mousedown on a handle grabs the column index, tracks
  // dx, mutates the widths array. ResizeTracker is inline to avoid
  // extra file overhead.
  const onHandleDown = (colIdx: number, ev: React.MouseEvent) => {
    if (!widths) return;
    ev.preventDefault();
    ev.stopPropagation();
    const startX = ev.clientX;
    const startW = widths[colIdx];
    const move = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const nextW = Math.max(40, startW + dx);
      setWidths((prev) => {
        if (!prev) return prev;
        const copy = prev.slice();
        copy[colIdx] = nextW;
        return copy;
      });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  // Render resize handles as absolutely-positioned divs overlaying the
  // right edge of each rendered th. Anchored to the outer container via
  // refs + useLayout-ish sizing on mount + window resize.
  const [handlePositions, setHandlePositions] = useState<Array<{
    left: number;
    top: number;
    height: number;
  }>>([]);
  useEffect(() => {
    if (!opts.resize || !widths) {
      setHandlePositions([]);
      return;
    }
    const measure = () => {
      const t = tableRef.current;
      const outer = outerRef.current;
      if (!t || !outer) return;
      const outerBox = outer.getBoundingClientRect();
      const ths = Array.from(t.querySelectorAll("thead th")) as HTMLElement[];
      setHandlePositions(
        ths.map((th) => {
          const r = th.getBoundingClientRect();
          return {
            left: r.right - outerBox.left - 3,
            top: r.top - outerBox.top,
            height: r.height,
          };
        })
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (tableRef.current) ro.observe(tableRef.current);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [opts.resize, widths]);

  const tableClass = useMemo(
    () =>
      [
        "fv-mdx-table",
        `fv-mdx-table--${opts.density}`,
        opts.sticky && "fv-mdx-table--sticky",
        opts.zebra && "fv-mdx-table--zebra",
        opts.resize && "fv-mdx-table--resize",
        opts.nowrap && "fv-mdx-table--nowrap",
      ]
        .filter(Boolean)
        .join(" "),
    [opts]
  );

  return (
    <div
      ref={outerRef}
      className="fv-mdx-table-outer"
      data-density={opts.density}
    >
      <div className="fv-mdx-table-wrap">
        <table ref={tableRef} className={tableClass} {...props} />
      </div>

      {opts.resize && handlePositions.length > 0 && (
        <div className="fv-mdx-table-handles" aria-hidden>
          {handlePositions.slice(0, -1).map((p, i) => (
            <div
              key={i}
              className="fv-mdx-table-handle"
              style={{ left: p.left, top: p.top, height: p.height }}
              onMouseDown={(e) => onHandleDown(i, e)}
            />
          ))}
        </div>
      )}

      <div className="fv-mdx-table-actions">
        <div className="fv-mdx-table-actions-row">
          {/* Options ---------------------------------------------- */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="fv-mdx-table-chip"
              onClick={() => {
                setOptsOpen((v) => !v);
                setDlOpen(false);
              }}
              title="Table options"
              aria-label="Table options"
            >
              ⚙ Options
            </button>
            {optsOpen && (
              <>
                <div
                  className="fv-mdx-table-backdrop"
                  onClick={() => setOptsOpen(false)}
                  aria-hidden
                />
                <div className="fv-mdx-table-menu">
                  <div className="fv-mdx-table-menu-label">Density</div>
                  <div className="fv-mdx-table-seg">
                    <SegBtn
                      active={opts.density === "compact"}
                      onClick={() => setDensity("compact")}
                    >
                      Compact
                    </SegBtn>
                    <SegBtn
                      active={opts.density === "cozy"}
                      onClick={() => setDensity("cozy")}
                    >
                      Cozy
                    </SegBtn>
                    <SegBtn
                      active={opts.density === "relaxed"}
                      onClick={() => setDensity("relaxed")}
                    >
                      Relaxed
                    </SegBtn>
                  </div>
                  <div className="fv-mdx-table-menu-sep" />
                  <ToggleRow
                    checked={opts.sticky}
                    onChange={() => toggle("sticky")}
                  >
                    Sticky header
                  </ToggleRow>
                  <ToggleRow
                    checked={opts.zebra}
                    onChange={() => toggle("zebra")}
                  >
                    Zebra stripes
                  </ToggleRow>
                  <ToggleRow
                    checked={opts.resize}
                    onChange={() => toggle("resize")}
                  >
                    Resize columns
                  </ToggleRow>
                  <ToggleRow
                    checked={opts.nowrap}
                    onChange={() => toggle("nowrap")}
                  >
                    Fit content (no wrap)
                  </ToggleRow>
                </div>
              </>
            )}
          </div>

          {/* Download -------------------------------------------- */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="fv-mdx-table-chip"
              onClick={() => {
                setDlOpen((v) => !v);
                setOptsOpen(false);
              }}
              title="Download table"
              aria-label="Download table"
            >
              ⬇ Download
            </button>
            {dlOpen && (
              <>
                <div
                  className="fv-mdx-table-backdrop"
                  onClick={() => setDlOpen(false)}
                  aria-hidden
                />
                <div className="fv-mdx-table-menu">
                  <button
                    type="button"
                    className="fv-mdx-table-menu-item"
                    onClick={dlCsv}
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    className="fv-mdx-table-menu-item"
                    onClick={dlJson}
                  >
                    JSON (pretty)
                  </button>
                  <button
                    type="button"
                    className="fv-mdx-table-menu-item"
                    onClick={dlJsonCompact}
                  >
                    JSON (compact)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`fv-mdx-table-seg-btn${active ? " active" : ""}`}
    >
      {children}
    </button>
  );
}

function ToggleRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="fv-mdx-table-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}

function rowsToObjects(headers: string[], rows: string[][]) {
  return rows.map((r) =>
    Object.fromEntries(headers.map((h, i) => [h || `col${i + 1}`, r[i] ?? ""]))
  );
}

/** RFC 4180 CSV: quote on `,` `"` `\n` `\r`; escape embedded quotes. */
function toCSV(headers: string[], rows: string[][]): string {
  const esc = (v: string): string =>
    /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [headers.map(esc).join(",")];
  for (const r of rows) lines.push(r.map(esc).join(","));
  return lines.join("\n");
}
