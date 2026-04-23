import type { ReactNode } from "react";
import { TONE_CLASS, type StatusTone } from "@filemark/datagrid";

/* ── <Stats> grid container ──────────────────────────────────────────── */

type Cols = "auto" | "2" | "3" | "4" | "5" | "6";

const COLS_CLASS: Record<Cols, string> = {
  auto: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  "2": "grid-cols-1 sm:grid-cols-2",
  "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  "4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  "5": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
  "6": "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

export function Stats({
  cols,
  children,
}: {
  cols?: string | number;
  children?: ReactNode;
}) {
  const key: Cols = normalizeCols(cols);
  return (
    <div className={["my-4 grid gap-3", COLS_CLASS[key]].join(" ")}>
      {children}
    </div>
  );
}

function normalizeCols(cols: string | number | undefined): Cols {
  const s = cols == null ? "auto" : String(cols);
  if (s === "2" || s === "3" || s === "4" || s === "5" || s === "6") return s;
  return "auto";
}

/* ── <Stat> card ─────────────────────────────────────────────────────── */

type Trend = "up" | "down" | "flat";

interface StatProps {
  title?: string;
  label?: string; // alias for title
  value?: string | number;
  delta?: string | number;
  description?: string;
  caption?: string; // alias for description
  /** Override auto tone inference. */
  intent?: StatusTone | "primary";
  /** Override auto arrow inference. */
  trend?: Trend;
  /** Optional wrapping link. */
  href?: string;
}

export function Stat({
  title,
  label,
  value,
  delta,
  description,
  caption,
  intent,
  trend,
  href,
}: StatProps) {
  const heading = title ?? label ?? "";
  const sub = description ?? caption ?? "";
  const { tone, arrow } = resolveDeltaPresentation({ delta, intent, trend });

  const inner = (
    <div className="bg-card flex flex-col gap-1 rounded-lg border p-4 shadow-sm">
      {heading && (
        <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {heading}
        </div>
      )}
      <div className="text-foreground text-2xl leading-tight font-semibold tabular-nums">
        {value ?? ""}
      </div>
      {delta != null && String(delta).length > 0 && (
        <div
          className={[
            "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            TONE_CLASS[tone],
          ].join(" ")}
        >
          {arrow && <TrendArrow trend={arrow} />}
          <span>{String(delta)}</span>
        </div>
      )}
      {sub && (
        <div className="text-muted-foreground text-xs leading-snug">
          {sub}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        className="hover:ring-ring block rounded-lg transition-shadow hover:ring-2"
      >
        {inner}
      </a>
    );
  }
  return inner;
}

function resolveDeltaPresentation({
  delta,
  intent,
  trend,
}: {
  delta?: string | number;
  intent?: StatusTone | "primary";
  trend?: Trend;
}): { tone: StatusTone; arrow: Trend | null } {
  const inferredTrend = trend ?? inferTrend(delta);
  const tone: StatusTone =
    intent ?? (inferredTrend === "up"
      ? "success"
      : inferredTrend === "down"
        ? "danger"
        : "muted");
  return { tone, arrow: delta != null ? inferredTrend : null };
}

function inferTrend(delta: string | number | undefined): Trend {
  if (delta == null) return "flat";
  const s = String(delta).trim();
  if (!s) return "flat";
  if (s.startsWith("+")) return "up";
  if (s.startsWith("-") || s.startsWith("−")) return "down";
  // Bare number — sign-less strings treated as neutral; numbers parsed.
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n) || n === 0) return "flat";
  return n > 0 ? "up" : "down";
}

function TrendArrow({ trend }: { trend: Trend }) {
  if (trend === "flat") {
    return (
      <svg
        viewBox="0 0 10 10"
        width="10"
        height="10"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M2 5 H8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  const up = trend === "up";
  return (
    <svg
      viewBox="0 0 10 10"
      width="10"
      height="10"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d={up ? "M5 2 L8.5 7 L1.5 7 Z" : "M5 8 L8.5 3 L1.5 3 Z"}
        fill="currentColor"
      />
    </svg>
  );
}
