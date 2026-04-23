import type { ChartRenderer } from "../types";
import { registerChartType } from "../core/registry";
import { transformPie } from "./shared/transforms";
import { validatePie } from "./shared/validators";
import { CustomTooltip } from "./shared/CustomTooltip";

interface PieDatum {
  name: string;
  value: number;
}

/** Label renderer for pie slices: truncates long names + skips labels
 *  for tiny slices to avoid overlap. Recharts calls this per-slice. */
function pieSliceLabel(props: {
  name?: string;
  percent?: number;
}): string | null {
  const { name = "", percent = 0 } = props;
  if (percent < 0.04) return null; // skip < 4% — too crowded
  const pct = Math.round(percent * 100);
  const truncated = name.length > 14 ? `${name.slice(0, 12)}…` : name;
  return `${truncated} ${pct}%`;
}

export const pieRenderer: ChartRenderer<PieDatum[]> = {
  type: "pie",
  transform: transformPie as ChartRenderer<PieDatum[]>["transform"],
  validate: validatePie,
  defaultOptions: {
    showLegend: true,
  },
  render: ({ data, options, recharts, palette, formatter }) => {
    const R = recharts;
    const rows = data.data;
    const total = rows.reduce((sum, r) => sum + r.value, 0);

    const outer = (options.height ?? 260) / 2 - 24;
    const inner = options.donut ? outer * 0.55 : 0;

    return (
      <R.ResponsiveContainer width="100%" height={options.height ?? 260}>
        <R.PieChart>
          <R.Tooltip
            content={
              <CustomTooltip
                series={data.series}
                formatter={formatter}
                active
              />
            }
          />
          {(options.showLegend ?? true) && (
            <R.Legend wrapperStyle={{ fontSize: 11, color: "currentColor" }} />
          )}
          <R.Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            outerRadius={outer}
            innerRadius={inner}
            isAnimationActive={false}
            label={pieSliceLabel}
          >
            {rows.map((_row, i) => (
              <R.Cell
                key={i}
                fill={palette.series(i)}
                stroke="var(--color-card)"
                strokeWidth={1.5}
              />
            ))}
          </R.Pie>
          {options.donut && options.showTotal && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              {formatter.format(total, data.series[0]?.format ?? { kind: "auto" })}
            </text>
          )}
        </R.PieChart>
      </R.ResponsiveContainer>
    );
  },
};

registerChartType(pieRenderer);
