import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { StorageAdapter } from "@filemark/core";
import type { CellValue, Column, StatusTone } from "./types";
import {
  TONE_CLASS,
  defaultStatusTone,
} from "./parseColumnType";
import { avatarColorClass, tagColorClass } from "./color-hash";

export interface CellCtx {
  value: CellValue;
  column: Column;
  rowId?: string;
  storage?: StorageAdapter;
  storageKey?: string;
  /** Space-separated substrings to highlight inside plain-text / markdown
   *  cells. Structured cell types (status, tags, avatar, …) ignore this. */
  highlight?: string;
}

const EM_DASH = (
  <span className="text-muted-foreground/40 italic">—</span>
);

function isBlank(v: CellValue): boolean {
  return v === null || v === undefined || v === "";
}

/* ── status ──────────────────────────────────────────────────────────── */

export function StatusCell({ value, column }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const label = String(value);
  const overrides = column.args?.colors;
  const tone: StatusTone = overrides?.[label] ?? defaultStatusTone(label);
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONE_CLASS[tone],
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

/* ── tags ────────────────────────────────────────────────────────────── */

export function TagsCell({ value, column }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const sep = column.args?.separator ?? ",";
  const tags = String(value)
    .split(sep)
    .map((t) => t.trim())
    .filter(Boolean);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <span
          key={t}
          className={[
            "rounded-md border px-1.5 py-[1px] text-[11px] font-medium",
            tagColorClass(t),
          ].join(" ")}
        >
          {t}
        </span>
      ))}
    </span>
  );
}

/* ── checkmark (read-only) ───────────────────────────────────────────── */

export function CheckmarkCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const truthy = value === true || /^(true|yes|1|y)$/i.test(String(value));
  return truthy ? (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
        <path
          d="M2.5 6.5 L5 9 L9.5 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  ) : (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
      <span className="h-[1.5px] w-2 rounded bg-current" />
    </span>
  );
}

/* ── checkbox (interactive, persists if rowId + storage present) ─────── */

export function CheckboxCell({
  value,
  column,
  rowId,
  storage,
  storageKey,
}: CellCtx) {
  const initial =
    value === true || /^(true|yes|1|y)$/i.test(String(value ?? ""));
  const [checked, setChecked] = useState(initial);
  const [hydrated, setHydrated] = useState(false);
  const canPersist = !!(rowId && storage && storageKey);
  const key = canPersist
    ? `filemark:datagrid:${storageKey}:cell:${rowId}:${column.key}`
    : null;
  const lastSavedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!key || !storage) {
      setHydrated(true);
      return;
    }
    let cancelled = false;
    storage.get<boolean>(key).then((saved) => {
      if (cancelled) return;
      if (typeof saved === "boolean") {
        setChecked(saved);
        lastSavedRef.current = saved;
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key, storage]);

  useEffect(() => {
    if (!hydrated || !key || !storage) return;
    if (lastSavedRef.current === checked) return;
    lastSavedRef.current = checked;
    void storage.set(key, checked);
  }, [hydrated, checked, key, storage]);

  return (
    <label className="inline-flex cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="h-3.5 w-3.5 cursor-pointer accent-primary"
        title={canPersist ? "toggle (persisted)" : "toggle (not persisted — needs an id column)"}
      />
    </label>
  );
}

/* ── rating ──────────────────────────────────────────────────────────── */

export function RatingCell({ value, column }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const max = column.args?.max ?? 5;
  const n = Math.max(0, Math.min(max, Number(value) || 0));
  return (
    <span
      className="inline-flex items-center gap-px"
      title={`${n} / ${max}`}
      aria-label={`${n} out of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.floor(n);
        const half = !filled && i < n;
        return (
          <svg key={i} viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
            <path
              d="M6 1 L7.5 4.3 L11 4.7 L8.3 7.1 L9 10.5 L6 8.7 L3 10.5 L3.7 7.1 L1 4.7 L4.5 4.3 Z"
              fill={filled ? "currentColor" : half ? "url(#half)" : "none"}
              stroke="currentColor"
              strokeWidth="0.8"
              strokeLinejoin="round"
              className="text-amber-500"
            />
            {half && (
              <defs>
                <linearGradient id="half" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
            )}
          </svg>
        );
      })}
    </span>
  );
}

/* ── progress ────────────────────────────────────────────────────────── */

export function ProgressCell({ value, column }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const min = column.args?.min ?? 0;
  const max = column.args?.max ?? 100;
  const n = Number(value);
  if (!Number.isFinite(n)) return <span>{String(value)}</span>;
  const pct = Math.max(0, Math.min(1, (n - min) / (max - min || 1)));
  const tone =
    pct >= 0.9
      ? "bg-emerald-500"
      : pct >= 0.5
        ? "bg-primary"
        : pct > 0
          ? "bg-amber-500"
          : "bg-muted";
  return (
    <span className="inline-flex w-full items-center gap-2">
      <span className="relative h-1.5 flex-1 min-w-[60px] overflow-hidden rounded-full bg-muted">
        <span
          className={["absolute left-0 top-0 h-full rounded-full transition-all", tone].join(" ")}
          style={{ width: `${pct * 100}%` }}
        />
      </span>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {Math.round(pct * 100)}%
      </span>
    </span>
  );
}

/* ── currency ────────────────────────────────────────────────────────── */

export function CurrencyCell({ value, column }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const code = column.args?.currencyCode ?? "USD";
  const n = Number(value);
  if (!Number.isFinite(n)) return <span>{String(value)}</span>;
  const fmt = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  });
  return <span className="tabular-nums">{fmt.format(n)}</span>;
}

/* ── percentage ──────────────────────────────────────────────────────── */

export function PercentageCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const n = Number(value);
  if (!Number.isFinite(n)) return <span>{String(value)}</span>;
  // 0..1 → scale up; otherwise treat as already-percentage
  const pct = n > 0 && n <= 1 ? n * 100 : n;
  return (
    <span className="tabular-nums">
      {pct.toLocaleString(undefined, { maximumFractionDigits: 1 })}%
    </span>
  );
}

/* ── filesize ────────────────────────────────────────────────────────── */

export function FilesizeCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const n = Number(value);
  if (!Number.isFinite(n)) return <span>{String(value)}</span>;
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return (
    <span className="tabular-nums">
      {v.toLocaleString(undefined, { maximumFractionDigits: 1 })} {units[i]}
    </span>
  );
}

/* ── url ─────────────────────────────────────────────────────────────── */

export function UrlCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const s = String(value);
  let href = s;
  if (!/^https?:\/\//i.test(s)) href = `https://${s}`;
  let display = s;
  try {
    const u = new URL(href);
    display = u.hostname + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    /* use raw */
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-80"
    >
      <svg viewBox="0 0 10 10" width="9" height="9" aria-hidden="true">
        <path
          d="M4 2 H2 V8 H8 V6 M6 2 H8 V4 M4 6 L8 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {display}
    </a>
  );
}

/* ── email ───────────────────────────────────────────────────────────── */

export function EmailCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const s = String(value);
  return (
    <a
      href={`mailto:${s}`}
      className="text-primary underline underline-offset-2 hover:opacity-80"
    >
      {s}
    </a>
  );
}

/* ── phone ───────────────────────────────────────────────────────────── */

export function PhoneCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const s = String(value);
  const tel = s.replace(/[^\d+]/g, "");
  return (
    <a
      href={`tel:${tel}`}
      className="text-primary underline underline-offset-2 hover:opacity-80"
    >
      {s}
    </a>
  );
}

/* ── code ────────────────────────────────────────────────────────────── */

export function CodeCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
      {String(value)}
    </code>
  );
}

/* ── color swatch ────────────────────────────────────────────────────── */

export function ColorCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const s = String(value).trim();
  const hex = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s)
    ? s.startsWith("#")
      ? s
      : `#${s}`
    : s;
  const valid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(hex);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-3.5 w-3.5 rounded border border-border/60 shadow-inner"
        style={{ backgroundColor: valid ? hex : undefined }}
        aria-hidden="true"
      />
      <code className="font-mono text-[11px]">{hex}</code>
    </span>
  );
}

/* ── date ────────────────────────────────────────────────────────────── */

export function DateCell({ value, column }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const s = String(value);
  const t = Date.parse(s);
  if (Number.isNaN(t)) return <span>{s}</span>;
  const d = new Date(t);
  const out = d.toLocaleDateString(column.args?.locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  return (
    <span className="tabular-nums" title={d.toISOString()}>
      {out}
    </span>
  );
}

/* ── relative time ───────────────────────────────────────────────────── */

export function RelativeCell({ value, column }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const s = String(value);
  const t = Date.parse(s);
  if (Number.isNaN(t)) return <span>{s}</span>;
  const now = Date.now();
  const delta = Math.round((t - now) / 1000);
  const abs = Math.abs(delta);
  const suffix = delta < 0 ? " ago" : " from now";
  const rel = formatDelta(abs) + suffix;
  return (
    <span
      className="tabular-nums"
      title={new Date(t).toLocaleString(column.args?.locale)}
    >
      {rel}
    </span>
  );
}

function formatDelta(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  if (secs < 86400) return `${Math.round(secs / 3600)}h`;
  if (secs < 2592000) return `${Math.round(secs / 86400)}d`;
  if (secs < 31536000) return `${Math.round(secs / 2592000)}mo`;
  return `${Math.round(secs / 31536000)}y`;
}

/* ── avatar ──────────────────────────────────────────────────────────── */

export function AvatarCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const raw = String(value);
  // `Ada Lovelace|https://...` → name + image url
  const [name, imageUrl] = raw.split("|").map((s) => s.trim());
  const initials = getInitials(name ?? raw);
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={[
          "inline-flex h-5 w-5 items-center justify-center rounded-full overflow-hidden text-[10px] font-semibold",
          imageUrl ? "bg-muted" : avatarColorClass(name ?? raw),
        ].join(" ")}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/* ── sparkline ───────────────────────────────────────────────────────── */

export function SparklineCell({ value, column }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const style = column.args?.sparkStyle ?? "line";
  const sep = column.args?.separator ?? ",";
  const raw = String(value);
  const nums = raw
    .split(sep)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  if (nums.length < 2) return <span>{raw}</span>;
  const w = 64;
  const h = 16;
  const pad = 1;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (nums.length - 1);
  const y = (n: number) =>
    h - pad - ((n - min) / range) * (h - pad * 2);
  const xs = nums.map((_, i) => pad + i * stepX);
  const last = nums.length - 1;

  if (style === "bar") {
    const barW = Math.max(1, stepX - 1);
    return (
      <svg width={w} height={h} className="text-primary" aria-hidden="true">
        {nums.map((n, i) => {
          const yy = y(n);
          return (
            <rect
              key={i}
              x={xs[i]! - barW / 2}
              y={yy}
              width={barW}
              height={h - pad - yy}
              fill="currentColor"
              opacity={0.8}
            />
          );
        })}
      </svg>
    );
  }

  const path = nums
    .map((n, i) => `${i === 0 ? "M" : "L"} ${xs[i]!.toFixed(2)} ${y(n).toFixed(2)}`)
    .join(" ");
  const areaPath = `${path} L ${xs[last]!.toFixed(2)} ${h - pad} L ${pad} ${h - pad} Z`;

  return (
    <svg width={w} height={h} className="text-primary" aria-hidden="true">
      {style === "area" && (
        <path d={areaPath} fill="currentColor" opacity={0.18} />
      )}
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={xs[last]} cy={y(nums[last]!)} r="1.6" fill="currentColor" />
    </svg>
  );
}

/* ── icon ────────────────────────────────────────────────────────────── */

/**
 * Tiny curated icon set. Values on the right are `d=` attribute strings
 * drawn inside a 16×16 viewBox with `strokeWidth=1.3` / `stroke=currentColor`.
 * Unknown keys fall back to the raw text.
 */
const ICON_PATHS: Record<string, string> = {
  check: "M3 8 L7 12 L13 5",
  x: "M4 4 L12 12 M12 4 L4 12",
  warning: "M8 2 L14 13 L2 13 Z M8 6 L8 10 M8 11.5 L8 12.2",
  info: "M8 2 a6 6 0 1 0 0 12 a6 6 0 1 0 0 -12 M8 6 L8 11 M8 4.2 L8 4.8",
  star: "M8 1.5 L10 6 L15 6.5 L11.2 9.8 L12.3 14.5 L8 12 L3.7 14.5 L4.8 9.8 L1 6.5 L6 6 Z",
  heart: "M8 14 C -2 7 4 1 8 5 C 12 1 18 7 8 14 Z",
  lock: "M4 8 L4 6 a4 4 0 0 1 8 0 L12 8 M3 8 L13 8 L13 14 L3 14 Z",
  rocket: "M9 2 C 12 4 13 7 12 10 L6 10 C 5 7 6 4 9 2 Z M6 10 L6 12 M12 10 L12 12 M9 5 a1 1 0 1 0 0 2 a1 1 0 1 0 0 -2",
  bug: "M6 6 L3 4 M10 6 L13 4 M6 10 L3 12 M10 10 L13 12 M6 6 L6 10 a2 2 0 0 0 4 0 L10 6 a2 2 0 0 0 -4 0 Z",
  clock: "M8 2 a6 6 0 1 0 0 12 a6 6 0 1 0 0 -12 M8 5 L8 8 L11 10",
  flame: "M8 14 C 4 14 2 11 3 8 C 4 6 6 7 5 4 C 9 6 10 8 10 10 C 12 9 12 7 11 5 C 14 8 14 12 11 14 Z",
  bolt: "M9 1 L3 9 L7 9 L6 15 L13 7 L9 7 Z",
  shield: "M8 1 L14 3 L14 8 C 14 11 11 13 8 15 C 5 13 2 11 2 8 L2 3 Z",
  mail: "M2 4 L14 4 L14 12 L2 12 Z M2 4 L8 9 L14 4",
  link: "M6 10 a3 3 0 0 0 0 -4 L3 6 a3 3 0 0 0 0 4 Z M10 6 a3 3 0 0 0 0 4 L13 10 a3 3 0 0 0 0 -4 Z M5 8 L11 8",
};

export function IconCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const key = String(value).trim().toLowerCase();
  const d = ICON_PATHS[key];
  if (!d) {
    return <code className="font-mono text-[11px]">{String(value)}</code>;
  }
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      className="text-foreground/80"
      aria-label={key}
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── country ─────────────────────────────────────────────────────────── */

export function CountryCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const raw = String(value).trim();
  const code = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) {
    const flag = String.fromCodePoint(
      code.charCodeAt(0) - 65 + 0x1f1e6,
      code.charCodeAt(1) - 65 + 0x1f1e6,
    );
    return (
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="text-[14px] leading-none">{flag}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {code}
        </span>
      </span>
    );
  }
  return <span>{raw}</span>;
}

/* ── duration ────────────────────────────────────────────────────────── */

export function DurationCell({ value, column }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const unit = column.args?.durationUnit ?? "s";
  const n = Number(value);
  if (!Number.isFinite(n)) return <span>{String(value)}</span>;
  let secs = n;
  if (unit === "ms") secs = n / 1000;
  else if (unit === "m") secs = n * 60;
  else if (unit === "h") secs = n * 3600;
  return <span className="tabular-nums">{formatDuration(secs)}</span>;
}

function formatDuration(secs: number): string {
  const neg = secs < 0 ? "-" : "";
  let s = Math.round(Math.abs(secs));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return neg + parts.slice(0, 2).join(" ");
}

/* ── range ───────────────────────────────────────────────────────────── */

export function RangeCell({ value, column }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const sep = column.args?.separator ?? "..";
  const parts = String(value).split(sep).map((s) => s.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return <span>{String(value)}</span>;
  }
  const [a, b] = parts as [string, string];
  const aDate = Date.parse(a);
  const bDate = Date.parse(b);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
    const fmt = (t: number) =>
      new Date(t).toLocaleDateString(column.args?.locale, {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    return (
      <span className="tabular-nums">
        {fmt(aDate)} <span className="opacity-50">→</span> {fmt(bDate)}
      </span>
    );
  }
  const aN = Number(a);
  const bN = Number(b);
  if (Number.isFinite(aN) && Number.isFinite(bN)) {
    return (
      <span className="tabular-nums">
        {aN.toLocaleString()} <span className="opacity-50">–</span>{" "}
        {bN.toLocaleString()}
      </span>
    );
  }
  return (
    <span>
      {a} <span className="opacity-50">→</span> {b}
    </span>
  );
}

/* ── code-block (multi-line monospace) ───────────────────────────────── */

export function CodeBlockCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const raw = String(value).replace(/\\n/g, "\n");
  return (
    <pre className="max-h-48 overflow-auto rounded-md bg-muted px-2 py-1 font-mono text-[11px] whitespace-pre leading-snug">
      {raw}
    </pre>
  );
}

/* ── json (inline pretty-print) ──────────────────────────────────────── */

export function JsonCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const raw = String(value).trim();
  try {
    const parsed = JSON.parse(raw);
    return (
      <pre className="max-h-48 overflow-auto rounded-md bg-muted px-2 py-1 font-mono text-[11px] whitespace-pre leading-snug">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  } catch {
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-destructive">
        {raw}
      </code>
    );
  }
}

/* ── image (via AssetResolver — fallback to raw URL) ─────────────────── */

export function ImageCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const src = String(value).trim();
  // For v1 of this type, accept absolute URLs directly. Relative paths
  // would need an AssetResolver threaded through; deferred.
  const absolute = /^(https?|data|blob):/i.test(src);
  if (!absolute) {
    return (
      <code className="rounded bg-muted px-1 font-mono text-[11px] text-muted-foreground">
        {src}
      </code>
    );
  }
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center"
    >
      <img
        src={src}
        alt=""
        className="h-8 w-8 rounded-sm border border-border/60 object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </a>
  );
}

/* ── id (monospace + copy) ───────────────────────────────────────────── */

export function IdCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const s = String(value);
  const [copied, setCopied] = useState(false);
  return (
    <code
      className="cursor-copy rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground whitespace-nowrap"
      title={copied ? "copied ✓" : `${s} — click to copy`}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(s).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {s}
    </code>
  );
}

/* ── plain number ────────────────────────────────────────────────────── */

export function NumberCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  const n = Number(value);
  if (!Number.isFinite(n)) return <span>{String(value)}</span>;
  return (
    <span className="tabular-nums">{n.toLocaleString()}</span>
  );
}

/* ── bool (primitive, non-interactive) ───────────────────────────────── */

export function BoolCell({ value }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  return <span>{value ? "true" : "false"}</span>;
}

/* ── markdown string (default) — inline subset only ──────────────────── */

export function MarkdownCell({ value, highlight }: CellCtx) {
  if (isBlank(value)) return EM_DASH;
  return <>{renderInlineMd(String(value), highlight)}</>;
}

/** Build a case-insensitive regex that matches any of the space-separated
 *  terms in `highlight`. Returns `null` when the term list is empty so callers
 *  can skip the split path entirely.  */
function buildHighlightRe(highlight: string | undefined): RegExp | null {
  if (!highlight) return null;
  const terms = highlight
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1);
  if (!terms.length) return null;
  const pattern = terms
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return new RegExp(`(${pattern})`, "gi");
}

function highlightText(text: string, re: RegExp, keyBase: number): ReactNode {
  const parts = text.split(re);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={`${keyBase}-${i}`}
        className="rounded bg-amber-200/60 px-[1px] text-inherit dark:bg-amber-500/40"
      >
        {part}
      </mark>
    ) : (
      <Fragment key={`${keyBase}-${i}`}>{part}</Fragment>
    ),
  );
}

const PATTERNS: Array<
  [RegExp, (m: RegExpMatchArray, key: number) => ReactNode]
> = [
  [
    /^`([^`]+)`/,
    (m, k) => (
      <code
        key={k}
        className="rounded bg-muted px-1 font-mono text-[0.9em]"
      >
        {m[1]}
      </code>
    ),
  ],
  [/^\*\*([^*]+)\*\*/, (m, k) => <strong key={k}>{m[1]}</strong>],
  [
    /^~~([^~]+)~~/,
    (m, k) => (
      <span key={k} className="line-through opacity-70">
        {m[1]}
      </span>
    ),
  ],
  [/^\*([^*\n]+)\*/, (m, k) => <em key={k}>{m[1]}</em>],
  [
    /^\[([^\]]+)\]\(([^)\s]+)\)/,
    (m, k) => (
      <a
        key={k}
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-80"
      >
        {m[1]}
      </a>
    ),
  ],
];

export function renderInlineMd(
  src: string,
  highlight?: string,
): ReactNode {
  const task = /^\s*\[( |x|X)\]\s+(.*)$/.exec(src);
  if (task) {
    const checked = task[1] !== " ";
    return (
      <span className="inline-flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={checked}
          readOnly
          aria-label={checked ? "done" : "todo"}
          className="h-3 w-3 accent-primary"
        />
        <span>{renderInlineMd(task[2] ?? "", highlight)}</span>
      </span>
    );
  }

  const re = buildHighlightRe(highlight);
  const flushBuf = (out: ReactNode[], buf: string) => {
    if (!buf) return;
    if (re) {
      out.push(
        <Fragment key={out.length}>{highlightText(buf, re, out.length)}</Fragment>,
      );
    } else {
      out.push(<Fragment key={out.length}>{buf}</Fragment>);
    }
  };

  const out: ReactNode[] = [];
  let buf = "";
  let i = 0;
  while (i < src.length) {
    let matched = false;
    for (const [r, make] of PATTERNS) {
      const m = r.exec(src.slice(i));
      if (m) {
        flushBuf(out, buf);
        buf = "";
        out.push(make(m, out.length));
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      buf += src[i];
      i++;
    }
  }
  flushBuf(out, buf);
  return out;
}
