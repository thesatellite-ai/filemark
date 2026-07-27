import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type TableHTMLAttributes,
} from "react";

/**
 * Wraps a rendered markdown table with a horizontal-scroll container and a
 * hover-revealed toolbar of uniform square ICON buttons (labels live in each
 * button's `data-tip` attribute, shown as a CSS hover tooltip):
 *
 *  Copy     — copy the table to the clipboard as TSV (spreadsheet paste),
 *             CSV, or Markdown. Flashes a check on success.
 *  Options  — per-table styling: density, sticky header, zebra, column
 *             resize, no-wrap.
 *  Download — export the rendered table data as CSV / JSON / compact.
 *  Expand   — blow the table up to a fixed fullscreen panel (Esc / ✕ closes).
 *
 * Table data is read from the DOM on copy/download so the export mirrors what
 * the user sees — inline markdown like links, code, and formatting flatten to
 * their textContent. Header cells become JSON keys.
 *
 * Fullscreen keeps the SAME table DOM node — only the outer container's
 * positioning class flips — so refs, resize handles, and the menus keep
 * working while expanded.
 *
 * Resize mode enables `table-layout: fixed`, snapshots each column's current
 * width, and draws drag handles on each th. Widths live in component state for
 * now (per-session, per-table). Wiring these into StorageAdapter for
 * persistence is a follow-on.
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
  const [copyOpen, setCopyOpen] = useState(false);
  const [widths, setWidths] = useState<number[] | null>(null);
  // Fullscreen expands the table to a fixed overlay covering the viewport so
  // wide/long tables get room to breathe. Same DOM node — we only toggle a
  // class on the outer container (no remount, so refs + resize handles keep
  // working). `copied` briefly labels the Copy chip after a successful write.
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Esc exits fullscreen. Registered only while open so it never swallows Esc
  // elsewhere. Body scroll is locked so the page behind doesn't scroll under
  // the overlay.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

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

  // Copy the current table to the clipboard in a paste-target-appropriate
  // format, then flash "Copied" on the chip for a beat. TSV is the default
  // because spreadsheets (Google Sheets, Excel, Numbers) parse tab-separated
  // rows into cells natively on paste — CSV pastes into a single cell.
  const copyAs = async (format: "tsv" | "csv" | "md") => {
    const { headers, rows } = readTable();
    const text =
      format === "tsv"
        ? toTSV(headers, rows)
        : format === "csv"
          ? toCSV(headers, rows)
          : toMarkdown(headers, rows);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked (e.g. insecure context) — silently no-op */
    }
    setCopyOpen(false);
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
    <>
      {/* Dim + click-catch behind the fullscreen panel. */}
      {fullscreen && (
        <div
          className="fv-mdx-table-fs-backdrop"
          onClick={() => setFullscreen(false)}
          aria-hidden
        />
      )}
      <div
        ref={outerRef}
        className={
          "fv-mdx-table-outer" +
          (fullscreen ? " fv-mdx-table-outer--fullscreen" : "")
        }
        data-density={opts.density}
      >
        {fullscreen && (
          <button
            type="button"
            className="fv-mdx-table-fs-close"
            onClick={() => setFullscreen(false)}
            data-tip="Exit fullscreen (Esc)"
            aria-label="Exit fullscreen"
          >
            <IconX />
          </button>
        )}
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
          {/* Copy ------------------------------------------------- */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="fv-mdx-table-chip"
              onClick={() => {
                setCopyOpen((v) => !v);
                setDlOpen(false);
                setOptsOpen(false);
              }}
              data-tip={copied ? "Copied!" : "Copy for Sheets / CSV / Markdown"}
              aria-label="Copy table to clipboard"
            >
              {copied ? <IconCheck /> : <IconCopy />}
            </button>
            {copyOpen && (
              <>
                <div
                  className="fv-mdx-table-backdrop"
                  onClick={() => setCopyOpen(false)}
                  aria-hidden
                />
                <div className="fv-mdx-table-menu">
                  <button
                    type="button"
                    className="fv-mdx-table-menu-item"
                    onClick={() => copyAs("tsv")}
                  >
                    For Sheets (TSV)
                  </button>
                  <button
                    type="button"
                    className="fv-mdx-table-menu-item"
                    onClick={() => copyAs("csv")}
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    className="fv-mdx-table-menu-item"
                    onClick={() => copyAs("md")}
                  >
                    Markdown
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Options ---------------------------------------------- */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="fv-mdx-table-chip"
              onClick={() => {
                setOptsOpen((v) => !v);
                setDlOpen(false);
              }}
              data-tip="Table options"
              aria-label="Table options"
            >
              <IconGear />
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
              data-tip="Download CSV / JSON"
              aria-label="Download table"
            >
              <IconDownload />
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

          {/* Expand / fullscreen --------------------------------- */}
          <button
            type="button"
            className="fv-mdx-table-chip"
            onClick={() => {
              setFullscreen((v) => !v);
              setDlOpen(false);
              setOptsOpen(false);
              setCopyOpen(false);
            }}
            data-tip={fullscreen ? "Exit fullscreen (Esc)" : "Expand to fullscreen"}
            aria-label={fullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
          >
            {fullscreen ? <IconMinimize /> : <IconExpand />}
          </button>
        </div>
      </div>
      </div>
    </>
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

// Inline SVG icons (this package ships no icon-library dependency — see the
// note in FileTree.tsx). All are 14×14, stroke = currentColor, so they inherit
// the chip's text colour and hover states. Kept minimal/uniform so every
// toolbar button is the same visual weight.
const ICON_SIZE = 14;
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
function IconCopy() {
  return (
    <Svg>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  );
}
function IconCheck() {
  return (
    <Svg>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}
function IconGear() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}
function IconDownload() {
  return (
    <Svg>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </Svg>
  );
}
function IconExpand() {
  return (
    <Svg>
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </Svg>
  );
}
function IconMinimize() {
  return (
    <Svg>
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="M14 10l7-7" />
      <path d="M3 21l7-7" />
    </Svg>
  );
}
function IconX() {
  return (
    <Svg>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </Svg>
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

/**
 * Tab-separated values — the format spreadsheets expect on paste. A literal
 * tab or newline inside a cell would break the row/column split, so we flatten
 * both to a single space (spreadsheets have no in-cell escape for bare TSV).
 */
function toTSV(headers: string[], rows: string[][]): string {
  const cell = (v: string): string => v.replace(/[\t\n\r]+/g, " ");
  const lines = [headers.map(cell).join("\t")];
  for (const r of rows) lines.push(r.map(cell).join("\t"));
  return lines.join("\n");
}

/**
 * GitHub-flavored markdown table — for pasting back into a `.md` doc. Escapes
 * `|` (column delimiter) and collapses newlines so each row stays one line.
 */
function toMarkdown(headers: string[], rows: string[][]): string {
  const cell = (v: string): string =>
    v.replace(/\|/g, "\\|").replace(/[\n\r]+/g, " ");
  const line = (cells: string[]): string => `| ${cells.map(cell).join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  return [line(headers), sep, ...rows.map(line)].join("\n");
}
