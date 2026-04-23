import type { ChartRenderer } from "../types";
import { registerChartType } from "../core/registry";
import { transformCategorical } from "./shared/transforms";
import { validateCategorical } from "./shared/validators";
import { CustomTooltip } from "./shared/CustomTooltip";

/**
 * Radar (spider / polar area) — good for showing multi-attribute
 * comparisons (e.g. feature coverage across products). Reuses the
 * same categorical transform as bar/line/area.
 *
 * Author: ```radar x=attribute y=product1,product2
 */
type CategoricalRows = Record<string, unknown>[];

export const radarRenderer: ChartRenderer<CategoricalRows> = {
  type: "radar",
  transform: transformCategorical,
  validate: validateCategorical,
  defaultOptions: {
    showLegend: true,
  },
  render: ({ data, options, recharts, palette, formatter }) => {
    const R = recharts;
    const xKey = options.x ?? (data.data[0] ? Object.keys(data.data[0])[0] : "");
    const rows = data.data;

    return (
      <R.ResponsiveContainer width="100%" height={options.height ?? 280}>
        <R.RadarChart data={rows} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
          <R.PolarGrid stroke="currentColor" strokeOpacity={0.2} />
          <R.PolarAngleAxis
            dataKey={xKey}
            tick={{ fill: "currentColor", fontSize: 11, opacity: 0.8 }}
          />
          <R.PolarRadiusAxis
            tick={{ fill: "currentColor", fontSize: 10, opacity: 0.6 }}
            stroke="currentColor"
            strokeOpacity={0.25}
          />
          <R.Tooltip
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
          {data.series.map((s, i) => (
            <R.Radar
              key={s.key}
              name={s.label}
              dataKey={s.key}
              stroke={s.color ?? palette.series(i)}
              fill={s.color ?? palette.series(i)}
              fillOpacity={0.25}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </R.RadarChart>
      </R.ResponsiveContainer>
    );
  },
};

registerChartType(radarRenderer);
