import type { ChartRenderer } from "../types";
import { registerChartType } from "../core/registry";
import { transformScatter } from "./shared/transforms";
import { validateCategorical } from "./shared/validators";
import { CustomTooltip } from "./shared/CustomTooltip";

type ScatterShape = Array<{
  name: string;
  points: Array<{ x: number; y: number }>;
}>;

export const scatterRenderer: ChartRenderer<ScatterShape> = {
  type: "scatter",
  transform: transformScatter,
  validate: validateCategorical,
  defaultOptions: {
    showGrid: true,
    showXAxis: true,
    showYAxis: true,
  },
  render: ({ data, options, recharts, palette, formatter }) => {
    const R = recharts;
    const groups = data.data;

    return (
      <R.ResponsiveContainer width="100%" height={options.height ?? 260}>
        <R.ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          {options.showGrid !== false && (
            <R.CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          )}
          <R.XAxis
            type="number"
            dataKey="x"
            name={data.xLabel}
            hide={options.showXAxis === false}
            stroke="currentColor"
            tick={{ fill: "currentColor", fontSize: 11, opacity: 0.7 }}
            tickFormatter={(v) => formatter.format(v, { kind: "auto" })}
            label={
              data.xLabel
                ? {
                    value: data.xLabel,
                    position: "insideBottom",
                    offset: -4,
                    fill: "currentColor",
                    fontSize: 11,
                  }
                : undefined
            }
          />
          <R.YAxis
            type="number"
            dataKey="y"
            name={data.yLabel}
            hide={options.showYAxis === false}
            stroke="currentColor"
            tick={{ fill: "currentColor", fontSize: 11, opacity: 0.7 }}
            tickFormatter={(v) => formatter.format(v, { kind: "auto" })}
            label={
              data.yLabel
                ? {
                    value: data.yLabel,
                    angle: -90,
                    position: "insideLeft",
                    fill: "currentColor",
                    fontSize: 11,
                  }
                : undefined
            }
          />
          <R.Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={
              <CustomTooltip
                series={data.series}
                formatter={formatter}
                active
              />
            }
          />
          {(options.showLegend ?? groups.length > 1) && (
            <R.Legend wrapperStyle={{ fontSize: 11, color: "currentColor" }} />
          )}
          {groups.map((g, i) => (
            <R.Scatter
              key={g.name || i}
              name={g.name === "_" ? data.yLabel : g.name}
              data={g.points}
              fill={palette.series(i)}
              isAnimationActive={false}
            />
          ))}
        </R.ScatterChart>
      </R.ResponsiveContainer>
    );
  },
};

registerChartType(scatterRenderer);
