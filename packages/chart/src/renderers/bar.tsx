import type { ChartRenderer } from "../types";
import { registerChartType } from "../core/registry";
import { transformCategorical } from "./shared/transforms";
import { validateCategorical } from "./shared/validators";
import { CustomTooltip } from "./shared/CustomTooltip";
import { renderAnnotations } from "./shared/Annotations";

type CategoricalRows = Record<string, unknown>[];

export const barRenderer: ChartRenderer<CategoricalRows> = {
  type: "bar",
  transform: transformCategorical,
  validate: validateCategorical,
  defaultOptions: {
    showGrid: true,
    showXAxis: true,
    showYAxis: true,
  },
  render: ({ data, options, recharts, palette, formatter }) => {
    const R = recharts;
    const xKey = options.x ?? (data.data[0] ? Object.keys(data.data[0])[0] : "");
    const rows = data.data;
    const layout = options.horizontal ? "vertical" : "horizontal";

    const xAxisLabel = data.xLabel
      ? {
          value: data.xLabel,
          position: "insideBottom",
          offset: -4,
          fill: "currentColor",
          fontSize: 11,
        }
      : undefined;
    const yAxisLabel = data.yLabel
      ? {
          value: data.yLabel,
          angle: -90,
          position: "insideLeft",
          fill: "currentColor",
          fontSize: 11,
        }
      : undefined;
    const categoryAxis = (
      <R.XAxis
        dataKey={xKey}
        type={options.horizontal ? "number" : "category"}
        hide={options.showXAxis === false}
        stroke="currentColor"
        tick={{ fill: "currentColor", fontSize: 11, opacity: 0.7 }}
        tickFormatter={
          options.horizontal
            ? undefined
            : (v) => formatter.format(v, { kind: "auto" })
        }
        label={options.horizontal ? undefined : xAxisLabel}
      />
    );
    const valueAxis = (
      <R.YAxis
        type={options.horizontal ? "category" : "number"}
        dataKey={options.horizontal ? xKey : undefined}
        hide={options.showYAxis === false}
        stroke="currentColor"
        tick={{ fill: "currentColor", fontSize: 11, opacity: 0.7 }}
        tickFormatter={
          options.horizontal
            ? undefined
            : (v) => formatter.format(v, { kind: "auto" })
        }
        label={options.horizontal ? undefined : yAxisLabel}
      />
    );

    return (
      <R.ResponsiveContainer width="100%" height={options.height ?? 260}>
        <R.BarChart
          data={rows}
          layout={layout}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          {options.showGrid !== false && (
            <R.CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          )}
          {options.horizontal ? valueAxis : categoryAxis}
          {options.horizontal ? categoryAxis : valueAxis}
          <R.Tooltip
            cursor={{ fill: "currentColor", opacity: 0.08 }}
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
              {...(options.horizontal ? { x: options.referenceLine } : { y: options.referenceLine })}
              stroke="currentColor"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
          )}
          {renderAnnotations(R, options)}
          {data.series.map((s, i) => (
            <R.Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color ?? palette.series(i)}
              stackId={options.stacked ? "stack" : undefined}
              radius={options.stacked ? 0 : [3, 3, 0, 0]}
            />
          ))}
        </R.BarChart>
      </R.ResponsiveContainer>
    );
  },
};

registerChartType(barRenderer);
