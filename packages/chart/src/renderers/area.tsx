import type { ChartRenderer } from "../types";
import { registerChartType } from "../core/registry";
import { transformCategorical } from "./shared/transforms";
import { validateCategorical } from "./shared/validators";
import { CustomTooltip } from "./shared/CustomTooltip";
import { renderAnnotations } from "./shared/Annotations";

type CategoricalRows = Record<string, unknown>[];

export const areaRenderer: ChartRenderer<CategoricalRows> = {
  type: "area",
  transform: transformCategorical,
  validate: validateCategorical,
  defaultOptions: {
    showGrid: true,
    showXAxis: true,
    showYAxis: true,
    showDots: false,
    stacked: false,
  },
  render: ({ data, options, recharts, palette, formatter }) => {
    const R = recharts;
    const xKey = options.x ?? (data.data[0] ? Object.keys(data.data[0])[0] : "");
    const rows = data.data;

    return (
      <R.ResponsiveContainer width="100%" height={options.height ?? 260}>
        <R.AreaChart
          data={rows}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          {options.showGrid !== false && (
            <R.CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          )}
          <R.XAxis
            dataKey={xKey}
            hide={options.showXAxis === false}
            stroke="currentColor"
            tick={{ fill: "currentColor", fontSize: 11, opacity: 0.7 }}
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
            cursor={{ stroke: "currentColor", strokeOpacity: 0.25 }}
            content={
              <CustomTooltip
                series={data.series}
                formatter={formatter}
                active
              />
            }
          />
          {(options.showLegend ?? data.series.length > 1) && (
            <R.Legend wrapperStyle={{ fontSize: 11, color: "currentColor" }} />
          )}
          {options.referenceLine !== undefined && (
            <R.ReferenceLine
              y={options.referenceLine}
              stroke="currentColor"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
          )}
          {renderAnnotations(R, options)}
          {data.series.map((s, i) => (
            <R.Area
              key={s.key}
              dataKey={s.key}
              name={s.label}
              type={options.smooth === false ? "linear" : "monotone"}
              stroke={s.color ?? palette.series(i)}
              fill={s.color ?? palette.series(i)}
              fillOpacity={0.2}
              strokeWidth={2}
              stackId={options.stacked ? "stack" : undefined}
              dot={options.showDots === true}
              isAnimationActive={false}
            />
          ))}
        </R.AreaChart>
      </R.ResponsiveContainer>
    );
  },
};

registerChartType(areaRenderer);
