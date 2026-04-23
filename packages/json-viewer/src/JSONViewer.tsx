import { useMemo, useState } from "react";
import JsonView from "@uiw/react-json-view";
import { githubDarkTheme } from "@uiw/react-json-view/githubDark";
import { githubLightTheme } from "@uiw/react-json-view/githubLight";
import { nordTheme } from "@uiw/react-json-view/nord";
import { vscodeTheme } from "@uiw/react-json-view/vscode";
import { basicTheme } from "@uiw/react-json-view/basic";
import { darkTheme } from "@uiw/react-json-view/dark";
import { lightTheme } from "@uiw/react-json-view/light";
import { monokaiTheme } from "@uiw/react-json-view/monokai";
import { gruvboxTheme } from "@uiw/react-json-view/gruvbox";
import { useThemeOptional, type ViewerProps } from "@filemark/core";
import { parseJSON } from "./parse";
import { JSONErrorBoundary } from "./ErrorBoundary";

const LARGE_FILE_THRESHOLD = 1_000_000; // 1 MB

export type JsonThemeId =
  | "githubDark"
  | "githubLight"
  | "nord"
  | "vscode"
  | "basic"
  | "dark"
  | "light"
  | "monokai"
  | "gruvbox";

/** Bundled themes from @uiw/react-json-view, keyed by stable id. The type
 *  is cast to `Record<JsonThemeId, object>` so tsup's DTS build doesn't try
 *  to portably name deep csstype types from node_modules. */
const THEMES = {
  githubDark: githubDarkTheme,
  githubLight: githubLightTheme,
  nord: nordTheme,
  vscode: vscodeTheme,
  basic: basicTheme,
  dark: darkTheme,
  light: lightTheme,
  monokai: monokaiTheme,
  gruvbox: gruvboxTheme,
} as Record<JsonThemeId, object>;

/** Runtime options that let a host (chrome-ext options page) customize the
 *  JSON viewer without re-mounting. All optional — reasonable defaults applied. */
export interface JSONViewerOptions {
  theme?: JsonThemeId | "auto";
  collapsedDepth?: number | false;
  displayDataTypes?: boolean;
  displayObjectSize?: boolean;
  enableClipboard?: boolean;
  shortenTextAfterLength?: number;
}

/**
 * JSON / JSONC viewer.
 *
 * Parsing: `jsonc-parser` — tolerant of comments + trailing commas.
 * Rendering: `@uiw/react-json-view` — themeable, collapsible, proven.
 * Theming: defaults to `auto` (follows host ThemeProvider) but any bundled
 * theme can be pinned via `options.theme`.
 */
export function JSONViewer(
  props: ViewerProps & { options?: JSONViewerOptions }
) {
  const { content, file, options } = props;
  const appTheme = useThemeOptional()?.theme ?? null;
  const [collapsed, setCollapsed] = useState<number | false>(
    options?.collapsedDepth ?? 2
  );
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => {
    try {
      return parseJSON(content);
    } catch (e) {
      return {
        value: null,
        errors: [
          { line: 0, column: 0, message: String((e as Error)?.message ?? e) },
        ],
        strict: false,
      };
    }
  }, [content]);

  const size = content.length;
  const tooLarge = size > LARGE_FILE_THRESHOLD;

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const csvStr = useMemo(
    () => (parsed.value !== null ? jsonToCSV(parsed.value) : null),
    [parsed.value]
  );
  const baseName = useMemo(
    () => file.name.replace(/\.(jsonc?|json5?)$/i, "") || "export",
    [file.name]
  );
  const [dlOpen, setDlOpen] = useState(false);

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
  const dlJson = () =>
    doDownload(
      JSON.stringify(parsed.value, null, 2),
      `${baseName}.json`,
      "application/json"
    );
  const dlJsonCompact = () =>
    doDownload(
      JSON.stringify(parsed.value),
      `${baseName}.min.json`,
      "application/json"
    );
  const dlCsv = () => {
    if (csvStr == null) return;
    doDownload(csvStr, `${baseName}.csv`, "text/csv");
  };

  const pickedTheme: JsonThemeId =
    options?.theme && options.theme !== "auto"
      ? options.theme
      : appTheme?.mode === "light"
        ? "githubLight"
        : "githubDark";
  const viewTheme = THEMES[pickedTheme];

  const fileType = file.ext.toLowerCase();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="bg-muted sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-md border border-b-0 px-3 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            {fileType.toUpperCase()}
          </span>
          {parsed.strict ? (
            <Pill intent="ok">valid</Pill>
          ) : parsed.errors.length > 0 ? (
            <Pill intent="warn">
              {parsed.errors.length} parse issue
              {parsed.errors.length === 1 ? "" : "s"}
            </Pill>
          ) : (
            <Pill intent="info">jsonc</Pill>
          )}
          <span className="text-muted-foreground tabular-nums">
            {formatBytes(size)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ToolbarBtn onClick={() => setCollapsed(1)} title="Collapse all">
            Collapse
          </ToolbarBtn>
          <ToolbarBtn onClick={() => setCollapsed(false)} title="Expand all">
            Expand
          </ToolbarBtn>
          <div className="relative">
            <ToolbarBtn
              onClick={() => setDlOpen((v) => !v)}
              title="Download options"
            >
              Download ▾
            </ToolbarBtn>
            {dlOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setDlOpen(false)}
                  aria-hidden
                />
                <div className="bg-background absolute right-0 top-full z-30 mt-1 min-w-[200px] rounded-md border p-1 shadow-md">
                  <DlRow onClick={dlJson} disabled={parsed.value === null}>
                    JSON (pretty)
                  </DlRow>
                  <DlRow
                    onClick={dlJsonCompact}
                    disabled={parsed.value === null}
                  >
                    JSON (compact)
                  </DlRow>
                  <DlRow onClick={dlCsv} disabled={csvStr == null}>
                    CSV
                    {csvStr == null && (
                      <span className="text-muted-foreground ml-auto text-[10px]">
                        flat array only
                      </span>
                    )}
                  </DlRow>
                </div>
              </>
            )}
          </div>
          <ToolbarBtn onClick={copyAll} title="Copy raw JSON" primary>
            {copied ? "Copied" : "Copy"}
          </ToolbarBtn>
        </div>
      </div>

      {parsed.errors.length > 0 && (
        <details className="border-x border-b-0 border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-foreground">
          <summary className="cursor-pointer font-semibold">
            {parsed.errors.length} parse issue(s) — click to inspect
          </summary>
          <ul className="mt-1.5 list-disc pl-5 font-mono text-[11px] text-muted-foreground">
            {parsed.errors.slice(0, 10).map((e, i) => (
              <li key={i}>
                line {e.line}, col {e.column} — {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}

      {tooLarge && (
        <div className="border-x border-b-0 border-amber-500/40 bg-amber-500/5 px-4 py-3 text-xs">
          <div className="text-foreground">
            <strong>{formatBytes(size)}</strong> JSON — rendered collapsed for
            speed.
          </div>
          <div className="text-muted-foreground mt-1">
            Use <kbd className="bg-muted rounded border px-1 text-[10px]">View raw source</kbd>{" "}
            from the file actions menu to see the raw file.
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-b-md border bg-card p-3 text-[13px] leading-relaxed">
        {renderJsonTree({
          value: parsed.value,
          pickedTheme,
          viewTheme,
          collapsed,
          tooLarge,
          options,
        })}
      </div>
    </div>
  );
}

/**
 * Render the JSON value tree. Guards against the common blow-up cases that
 * `@uiw/react-json-view` doesn't handle internally: a primitive / null /
 * undefined root, or a value shape the library chokes on. For primitives
 * and null we show a tiny inline rendering instead of handing it off.
 */
function renderJsonTree({
  value,
  pickedTheme,
  viewTheme,
  collapsed,
  tooLarge,
  options,
}: {
  value: unknown;
  pickedTheme: string;
  viewTheme: object;
  collapsed: number | false;
  tooLarge: boolean;
  options?: JSONViewerOptions;
}) {
  if (value === undefined) {
    return (
      <div className="text-muted-foreground py-4 text-center text-xs italic">
        (empty file)
      </div>
    );
  }
  if (value === null) {
    return (
      <pre className="text-muted-foreground m-0 py-4 text-center font-mono text-xs italic">
        null
      </pre>
    );
  }
  if (typeof value !== "object") {
    // Primitive root: stringify for read-only display. react-json-view
    // expects an object/array at the root and will blow up otherwise.
    return (
      <pre className="m-0 font-mono text-[13px] leading-relaxed">
        {JSON.stringify(value)}
      </pre>
    );
  }
  return (
    <JSONErrorBoundary>
      <JsonView
        key={`jv-${pickedTheme}-${collapsed}`}
        value={value as object}
        style={viewTheme}
        collapsed={tooLarge ? 1 : collapsed}
        enableClipboard={options?.enableClipboard ?? true}
        displayDataTypes={options?.displayDataTypes ?? false}
        displayObjectSize={options?.displayObjectSize ?? true}
        shortenTextAfterLength={options?.shortenTextAfterLength ?? 140}
      />
    </JSONErrorBoundary>
  );
}

function ToolbarBtn({
  children,
  onClick,
  title,
  primary,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={
        primary
          ? "bg-primary text-primary-foreground hover:opacity-90 rounded px-2 py-0.5 text-[11px] font-medium transition-opacity"
          : "text-muted-foreground hover:border-ring hover:text-foreground rounded border bg-transparent px-2 py-0.5 text-[11px] transition-colors"
      }
    >
      {children}
    </button>
  );
}

function DlRow({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] outline-none transition-colors disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/**
 * Convert a JSON value to CSV when it's a flat array of plain objects.
 * Returns null otherwise — caller should disable the CSV option.
 * Union of keys across all rows forms the header; nested values are
 * JSON-stringified into a single cell. Escaping: quote on `,` / `"` /
 * newline; double up embedded quotes.
 */
function jsonToCSV(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  if (value.length === 0) return "";
  const rowsOk = value.every(
    (r) => r !== null && typeof r === "object" && !Array.isArray(r)
  );
  if (!rowsOk) return null;
  const keySet = new Set<string>();
  for (const row of value) {
    for (const k of Object.keys(row as Record<string, unknown>)) keySet.add(k);
  }
  const keys = [...keySet];
  const esc = (v: unknown): string => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [keys.join(",")];
  for (const row of value) {
    const rec = row as Record<string, unknown>;
    lines.push(keys.map((k) => esc(rec[k])).join(","));
  }
  return lines.join("\n");
}

function Pill({
  children,
  intent,
}: {
  children: React.ReactNode;
  intent: "ok" | "warn" | "info";
}) {
  const cls =
    intent === "ok"
      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
      : intent === "warn"
        ? "bg-amber-500/15 text-amber-400 border border-amber-500/40"
        : "bg-accent text-accent-foreground border border-transparent";
  return (
    <span className={`${cls} rounded-full px-2 py-[1px] text-[10px] font-semibold`}>
      {children}
    </span>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
