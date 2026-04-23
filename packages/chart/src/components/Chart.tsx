import { useEffect, useState } from "react";
import type { Column, Row } from "@filemark/datagrid";
import type { ChartOptions } from "../types";
import { getChartRenderer } from "../core/registry";
import { getPalette, withOverrides } from "../core/palette";
import { DEFAULT_FORMATTER } from "../core/format";
import { useRecharts, RechartsProvider } from "../core/lazyRecharts";
import { ChartContainer } from "./ChartContainer";
import { ChartLoading } from "./ChartLoading";
import { TableFallback } from "./TableFallback";
import { ChartErrorCard } from "../renderers/shared/ErrorCard";
// Side-effect: built-in renderers register themselves here.
import "../renderers";

export interface ChartProps {
  columns: Column[];
  rows: Row[];
  options: ChartOptions;
}

/**
 * Top-level renderer. Zero chart-type knowledge of its own — it:
 *   1) pulls a renderer from the registry,
 *   2) asks the renderer to transform the data,
 *   3) hands the resulting props + lazy-loaded recharts + resolved
 *      palette + formatter to the renderer's `render(ctx)`.
 *
 * Renderers are registered once at module load; future additions
 * slot in without touching this file.
 */
export function Chart(props: ChartProps) {
  return (
    <RechartsProvider>
      <ChartInner {...props} />
    </RechartsProvider>
  );
}

function ChartInner({ columns, rows, options }: ChartProps) {
  const recharts = useRecharts();
  const renderer = getChartRenderer(options.type);
  const [fullscreen, setFullscreen] = useState(false);

  // Escape to exit fullscreen.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  if (!renderer) {
    return (
      <ChartContainer
        options={options}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((v) => !v)}
      >
        <div className="px-3 py-4 text-xs italic text-muted-foreground">
          unknown chart type: <code>{options.type}</code>
        </div>
      </ChartContainer>
    );
  }

  // Layer renderer defaults under the author options so we don't have
  // to thread defaults through every renderer.
  const merged: ChartOptions = { ...renderer.defaultOptions, ...options };

  // Apply author `colors=` + named palette override.
  const palette = withOverrides(getPalette(merged.paletteName), merged.colors);

  // Up-front validation — surfaces misconfigs BOTH in the console
  // AND on-screen as a card, so authors catch typos without opening
  // DevTools. Rule 3 — skeleton honesty.
  const warnings = renderer.validate
    ? renderer.validate(merged, columns)
    : [];
  for (const w of warnings) console.warn(`[@filemark/chart] ${w}`);

  // If the validator returned any fatal-shaped warnings (missing
  // required column, non-numeric y), show the error card instead of
  // rendering an empty chart. Non-fatal warnings still render the chart.
  const isFatal = warnings.some(
    (w) =>
      /is not a column/.test(w) ||
      /not in columns/.test(w),
  );

  if (isFatal) {
    return (
      <ChartContainer
        options={merged}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((v) => !v)}
      >
        <ChartErrorCard messages={warnings} height={merged.height ?? 120} />
      </ChartContainer>
    );
  }

  const data = renderer.transform(columns, rows, merged);

  if (!recharts) {
    return (
      <ChartContainer
        options={merged}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((v) => !v)}
      >
        <ChartLoading height={merged.height ?? 260} />
      </ChartContainer>
    );
  }

  // In fullscreen, let ResponsiveContainer fill the expanded body
  // (which is flex-1 min-h-0 — see ChartContainer). Number height
  // stays a number outside fullscreen so the small-chart layout
  // behaves exactly as before.
  const chartHeight: number | string = fullscreen
    ? "100%"
    : merged.height ?? 260;

  return (
    <ChartContainer
      options={merged}
      fullscreen={fullscreen}
      onToggleFullscreen={() => setFullscreen((v) => !v)}
    >
      {renderer.render({
        data,
        options: merged,
        height: chartHeight,
        recharts,
        palette,
        formatter: DEFAULT_FORMATTER,
      })}
      {merged.showTable && (
        <TableFallback columns={columns} rows={rows} options={merged} />
      )}
    </ChartContainer>
  );
}
