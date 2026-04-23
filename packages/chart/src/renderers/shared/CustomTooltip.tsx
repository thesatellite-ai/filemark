import type { ChartSeriesConfig, FormatResolver, FormatSpec } from "../../types";
import type { Column } from "@filemark/datagrid";

interface TooltipPayloadItem {
  name?: string;
  value?: unknown;
  color?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

/**
 * Recharts-compatible tooltip that respects the active palette +
 * per-column formatters. Each renderer passes the same props shape
 * (recharts calls `<Tooltip content={<CustomTooltip ... />}>`).
 *
 * Intentionally styled with shadcn tokens so it adopts the current
 * theme without a per-chart style block.
 */
export function CustomTooltip({
  active,
  payload,
  label,
  series,
  formatter,
  xColumn,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: unknown;
  series: ChartSeriesConfig[];
  formatter: FormatResolver;
  xColumn?: Column;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const spec: FormatSpec = { kind: "auto" };

  return (
    <div
      role="tooltip"
      className="rounded-md border border-border/60 bg-popover px-2.5 py-1.5 text-[11.5px] text-popover-foreground shadow-md"
    >
      {label !== undefined && label !== "" && (
        <div className="mb-0.5 font-medium">
          {formatter.format(label, spec, xColumn)}
        </div>
      )}
      <ul className="m-0 space-y-0.5 p-0">
        {payload.map((row, i) => {
          const cfg = series.find((s) => s.key === row.dataKey);
          return (
            <li
              key={`${row.dataKey ?? i}`}
              className="flex items-center gap-1.5"
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: row.color ?? cfg?.color ?? "currentColor" }}
              />
              <span className="text-muted-foreground">
                {cfg?.label ?? row.name ?? row.dataKey}
              </span>
              <span className="ml-auto font-medium tabular-nums">
                {formatter.format(row.value, cfg?.format ?? spec)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
