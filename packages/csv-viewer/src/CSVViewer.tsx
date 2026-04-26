import { useMemo, useState } from "react";
import { DataGridFromText, parseCSV } from "@filemark/datagrid";
import type { ViewerProps } from "@filemark/core";

/**
 * CSVViewer — file viewer for `.csv` and `.tsv`.
 *
 * Thin wrapper around `@filemark/datagrid`'s `DataGridFromText`. The
 * underlying grid handles delimiter inference, type inference, sort,
 * filter, and copy-as-CSV/MD/JSON. This component only adds the
 * file-viewer chrome: a small header bar with filename, row x col
 * count, and a delimiter pill.
 *
 * Tab/comma detection: explicit override for `.tsv` (forces `\t`),
 * everything else lets papaparse autodetect.
 */
export function CSVViewer(props: ViewerProps) {
  const { content, file, storage } = props;

  const ext = file.ext.toLowerCase().replace(/^\./, "");
  const defaultDelimiter = ext === "tsv" ? "\t" : undefined;

  // Parse once for the header chrome (row/col counts + actual delimiter).
  // DataGridFromText re-parses internally with identical args, but the
  // result is cheap to compute and the alternative would mean threading
  // counts up through DataGrid.
  const summary = useMemo(() => {
    if (!content || content.trim() === "") {
      return { rows: 0, cols: 0, delimiter: defaultDelimiter ?? "," };
    }
    try {
      const t = parseCSV({
        text: content,
        delimiter: defaultDelimiter,
        header: true,
      });
      return {
        rows: t.rows.length,
        cols: t.columns.length,
        delimiter: defaultDelimiter ?? inferDelimiter(content),
      };
    } catch {
      return { rows: 0, cols: 0, delimiter: defaultDelimiter ?? "," };
    }
  }, [content, defaultDelimiter]);

  const [copied, setCopied] = useState(false);
  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  const downloadOriginal = () => {
    const mime = ext === "tsv" ? "text/tab-separated-values" : "text/csv";
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name || `export.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isEmpty = !content || content.trim() === "";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="bg-muted sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-md border border-b-0 px-3 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            {ext.toUpperCase()}
          </span>
          {!isEmpty && (
            <>
              <span className="text-muted-foreground tabular-nums">
                {summary.rows.toLocaleString()} row
                {summary.rows === 1 ? "" : "s"} &times;{" "}
                {summary.cols.toLocaleString()} col
                {summary.cols === 1 ? "" : "s"}
              </span>
              <DelimiterPill delimiter={summary.delimiter} />
            </>
          )}
          <span className="text-muted-foreground tabular-nums">
            {formatBytes(content.length)}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <IconBtn
            onClick={downloadOriginal}
            title={`Download original file (${file.name || `file.${ext}`})`}
          >
            <IconDownload />
          </IconBtn>
          <IconBtn
            onClick={copyAll}
            title={copied ? "Copied!" : "Copy raw CSV to clipboard"}
            active={copied}
          >
            {copied ? <IconCheck /> : <IconCopy />}
          </IconBtn>
        </div>
      </div>

      <div className="overflow-x-auto rounded-b-md border bg-card">
        {isEmpty ? (
          <div className="text-muted-foreground py-12 text-center text-xs italic">
            (empty file)
          </div>
        ) : (
          <DataGridFromText
            text={content}
            defaultDelimiter={defaultDelimiter}
            storage={storage}
            storageKey={`fv:csv:${file.id}`}
            rawLang={ext}
            rawSource={content}
          />
        )}
      </div>
    </div>
  );
}

function DelimiterPill({ delimiter }: { delimiter: string }) {
  const label =
    delimiter === "\t"
      ? "tab"
      : delimiter === ","
        ? "comma"
        : delimiter === ";"
          ? "semicolon"
          : delimiter === "|"
            ? "pipe"
            : `"${delimiter}"`;
  return (
    <span className="bg-accent text-accent-foreground rounded-full border border-transparent px-2 py-[1px] text-[10px] font-semibold">
      {label}
    </span>
  );
}

// Mirror of papaparse's heuristic used inside parseCSV when delimiter is
// undefined. We re-implement the count-the-most-frequent rule here just
// so the header pill can show the right label without re-parsing twice.
function inferDelimiter(text: string): string {
  const sample = text.slice(0, 4096).split(/\r?\n/).slice(0, 10).join("\n");
  const candidates = [",", "\t", ";", "|"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const escaped = d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "g");
    const count = (sample.match(re) ?? []).length;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function IconBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        "inline-flex size-7 items-center justify-center rounded-md border border-transparent transition-colors",
        active
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground hover:border-border hover:bg-background hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function IconDownload() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
