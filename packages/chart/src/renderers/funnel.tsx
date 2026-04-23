import type { ChartRenderer } from "../types";
import { registerChartType } from "../core/registry";
import { transformPie } from "./shared/transforms";
import { validatePie } from "./shared/validators";
import { CustomTooltip } from "./shared/CustomTooltip";

/**
 * Funnel chart — conversion stages, drop-off visualization. Data
 * shape is the same as pie ({name, value}) so we reuse transformPie.
 * Recharts ships a `<Funnel>` + `<FunnelChart>` pair.
 *
 * Author: ```funnel name=stage value=users
 */
interface FunnelDatum {
  name: string;
  value: number;
}

export const funnelRenderer: ChartRenderer<FunnelDatum[]> = {
  type: "funnel",
  transform: transformPie as ChartRenderer<FunnelDatum[]>["transform"],
  validate: validatePie,
  defaultOptions: {
    showLegend: false,
  },
  render: ({ data, options, recharts, palette, formatter }) => {
    const R = recharts;
    const rows = data.data.map((r, i) => ({
      ...r,
      fill: palette.series(i),
    }));

    return (
      <R.ResponsiveContainer width="100%" height={options.height ?? 260}>
        <R.FunnelChart>
          <R.Tooltip
            content={
              <CustomTooltip
                series={data.series}
                formatter={formatter}
                active
              />
            }
          />
          {(options.showLegend ?? false) && (
            <R.Legend wrapperStyle={{ fontSize: 11, color: "currentColor" }} />
          )}
          <R.Funnel
            dataKey="value"
            nameKey="name"
            data={rows}
            isAnimationActive={false}
          >
            <R.LabelList
              position="right"
              fill="currentColor"
              stroke="none"
              dataKey="name"
              fontSize={11}
            />
          </R.Funnel>
        </R.FunnelChart>
      </R.ResponsiveContainer>
    );
  },
};

registerChartType(funnelRenderer);
