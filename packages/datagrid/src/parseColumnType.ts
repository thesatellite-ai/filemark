import type { ColumnType, ColumnTypeArgs, ColumnTypeSpec, StatusTone } from "./types";

const TYPE_NAMES: ReadonlySet<ColumnType> = new Set<ColumnType>([
  "string",
  "number",
  "date",
  "bool",
  "status",
  "tags",
  "checkmark",
  "checkbox",
  "rating",
  "progress",
  "currency",
  "percentage",
  "filesize",
  "url",
  "email",
  "phone",
  "code",
  "color",
  "relative",
  "avatar",
  "sparkline",
  "icon",
  "country",
  "duration",
  "range",
  "code-block",
  "json",
  "image",
  "id",
]);

const TONES: ReadonlySet<StatusTone> = new Set<StatusTone>([
  "success",
  "warn",
  "danger",
  "info",
  "muted",
  "primary",
  "secondary",
]);

const TONE_ALIAS: Record<string, StatusTone> = {
  green: "success",
  ok: "success",
  done: "success",
  red: "danger",
  blocked: "danger",
  fail: "danger",
  amber: "warn",
  yellow: "warn",
  orange: "warn",
  gray: "muted",
  grey: "muted",
  neutral: "muted",
  blue: "info",
};

/**
 * Parse a column type expression. Accepted shapes:
 *   string                          → { type: "string" }
 *   status                          → { type: "status" }
 *   status(P0:danger,P1:warn)       → { type: "status", args: { colors: {...} } }
 *   currency(USD)                   → { type: "currency", args: { currencyCode: "USD" } }
 *   progress(0:100)                 → { type: "progress", args: { min: 0, max: 100 } }
 *   progress                        → { type: "progress" } (defaults 0..100)
 *   rating(5)                       → { type: "rating", args: { max: 5 } }
 *   tags                            → { type: "tags" }
 *   tags(|)                         → { type: "tags", args: { separator: "|" } }
 *
 * Unknown type → null (caller should warn + fall back to string).
 */
export function parseColumnType(
  expr: string,
): ColumnTypeSpec | null {
  if (!expr) return null;
  const trimmed = expr.trim();
  const parenStart = trimmed.indexOf("(");
  const name = (parenStart === -1 ? trimmed : trimmed.slice(0, parenStart))
    .trim()
    .toLowerCase();
  if (!TYPE_NAMES.has(name as ColumnType)) return null;

  const type = name as ColumnType;
  if (parenStart === -1) return { type };

  const end = trimmed.lastIndexOf(")");
  if (end === -1 || end < parenStart) return { type };
  const argsBody = trimmed.slice(parenStart + 1, end).trim();
  if (!argsBody) return { type };

  const args = parseArgs(type, argsBody);
  return args ? { type, args } : { type };
}

function parseArgs(type: ColumnType, body: string): ColumnTypeArgs | null {
  switch (type) {
    case "status": {
      const colors: Record<string, StatusTone> = {};
      for (const pair of body.split(",")) {
        const [k, v] = pair.split(":").map((s) => s.trim());
        if (!k || !v) continue;
        const tone = resolveTone(v);
        if (tone) colors[k] = tone;
      }
      return Object.keys(colors).length ? { colors } : null;
    }
    case "currency": {
      const code = body.replace(/[^a-zA-Z]/g, "").toUpperCase();
      return code ? { currencyCode: code } : null;
    }
    case "progress": {
      const parts = body.split(":").map((s) => Number(s.trim()));
      if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
        return { min: parts[0]!, max: parts[1]! };
      }
      if (parts.length === 1 && Number.isFinite(parts[0]!)) {
        return { min: 0, max: parts[0]! };
      }
      return null;
    }
    case "rating": {
      const n = Number(body);
      return Number.isFinite(n) ? { max: n } : null;
    }
    case "tags": {
      return { separator: body };
    }
    case "sparkline": {
      const s = body.toLowerCase();
      if (s === "line" || s === "bar" || s === "area") {
        return { sparkStyle: s as "line" | "bar" | "area" };
      }
      return null;
    }
    case "duration": {
      const s = body.toLowerCase();
      if (s === "s" || s === "ms" || s === "m" || s === "h") {
        return { durationUnit: s as "s" | "ms" | "m" | "h" };
      }
      return null;
    }
    case "range": {
      return { separator: body };
    }
    default:
      return null;
  }
}

function resolveTone(v: string): StatusTone | null {
  const low = v.toLowerCase();
  if (TONES.has(low as StatusTone)) return low as StatusTone;
  if (TONE_ALIAS[low]) return TONE_ALIAS[low];
  return null;
}

const DEFAULT_STATUS_MAP: Record<string, StatusTone> = {
  done: "success",
  ok: "success",
  complete: "success",
  completed: "success",
  success: "success",
  pass: "success",
  passed: "success",
  active: "success",
  yes: "success",
  live: "success",
  pending: "warn",
  todo: "warn",
  wip: "warn",
  "in-progress": "warn",
  "in_progress": "warn",
  review: "warn",
  waiting: "warn",
  draft: "warn",
  fail: "danger",
  failed: "danger",
  error: "danger",
  blocked: "danger",
  cancelled: "danger",
  canceled: "danger",
  rejected: "danger",
  no: "danger",
  expired: "danger",
  info: "info",
  note: "info",
  new: "info",
};

export function defaultStatusTone(value: string): StatusTone {
  const low = value.trim().toLowerCase().replace(/\s+/g, "_");
  return DEFAULT_STATUS_MAP[low] ?? "muted";
}

export const TONE_CLASS: Record<StatusTone, string> = {
  success:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  danger: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  info: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  muted: "bg-muted text-muted-foreground border-border/60",
  primary: "bg-primary/15 text-primary border-primary/30",
  secondary:
    "bg-secondary text-secondary-foreground border-border/60",
};
