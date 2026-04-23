# `@filemark/chart` — architecture

Plug-in-first chart package. Adding a new chart type or a new
formatter / palette NEVER requires editing a central switch. Every
unit of domain logic lives in its own file behind a named interface.

- **First-author date:** 2026-04-23
- **Companion plan:** `docsi/CHART_PLAN.md` (what + why)
- **This doc:** how the code is organized + the plug-in contracts

---

## 1. Design axioms

1. **Nothing central-switches on `type`.** The top-level `Chart.tsx`
   asks the registry for a renderer. A new chart type = one new file
   + one `registerChartType()` call. No grep-and-patch in a
   `switch (type) { case "bar": … }`.
2. **Every non-trivial concern is a registry.** Chart types,
   formatters, palettes, axis scales — all lookups, all pluggable.
3. **Data transform lives beside its renderer.** A chart type knows
   its own data shape (`{x, y1, y2}` vs `{name, value}` vs
   `[[x, y]]`). No shared god-module deciding for it.
4. **One file per concept.** A file is the unit of code review.
   Cap modules at ≤ ~150 LOC; if a file grows, it gets split.
5. **Recharts is lazy.** The chart package exports components that
   dynamic-`import("recharts")` on first mount. Markdown docs with no
   charts don't pay the ~50 KB.
6. **Theming via CSS vars only.** No hardcoded hex inside renderers.
   Colors come from the palette registry which emits `var(--…)`.
   Themes "just work" across light / dark / sepia.
7. **Accessibility is not a v2.** Every chart ships an `aria-label`,
   screen-reader tooltip roles, and an optional data-table fallback
   that re-uses `@filemark/datagrid`. Zero extra infra.
8. **No state in renderers.** Renderers receive props, return JSX,
   done. State (hover, zoom, brush) lives in shared hooks under
   `core/hooks/` so two renderers can opt-in to the same behavior
   without copy-paste.

---

## 2. File layout

```
packages/chart/
├── ARCHITECTURE.md                          this doc
├── package.json
├── tsconfig.json
├── tsup.config.ts
│
└── src/
    ├── index.ts                             public API surface (thin barrel)
    │
    ├── types.ts                             every exported TS type lives here
    │
    ├── core/
    │   ├── registry.ts                      register / get chart renderers
    │   ├── palette.ts                       register / get palettes; default palette
    │   ├── format.ts                        register / get value formatters
    │   ├── parseInfoString.ts               info-string → ChartOptions (extends datagrid)
    │   ├── attrsToOptions.ts                <Chart> HTML attrs → ChartOptions
    │   ├── ariaLabel.ts                     deterministic aria-label from options
    │   └── lazyRecharts.ts                  dynamic import + context provider for recharts
    │
    ├── components/
    │   ├── Chart.tsx                        looks up renderer, calls .render()
    │   ├── ChartFromText.tsx                parseCSV → Chart
    │   ├── ChartBlock.tsx                   src= fetch + loading/error → ChartFromText
    │   ├── ChartContainer.tsx               outer frame (title, aria, table-fallback toggle)
    │   ├── ChartLoading.tsx                 spinner while recharts loads
    │   └── TableFallback.tsx                data-table fallback using @filemark/datagrid
    │
    ├── renderers/
    │   ├── index.ts                         side-effect: registers built-ins
    │   ├── bar.tsx                          bar renderer (single file — renderer + transform + defaults)
    │   ├── line.tsx                         line renderer
    │   ├── pie.tsx                          pie renderer (incl. donut variant)
    │   ├── area.tsx                         area renderer (stretch for v1)
    │   ├── scatter.tsx                      (v2 placeholder / stub)
    │   └── shared/
    │       ├── CustomTooltip.tsx            shared recharts tooltip w/ shadcn styling
    │       ├── AxisTick.tsx                 styled tick labels
    │       └── ReferenceLine.tsx            shared reference-line rendering
    │
    └── utils/
        ├── hash.ts                          FNV-1a for storage keys
        └── coerce.ts                        string → number | Date | string (reuses datagrid patterns)
```

Every file is small. Nothing is > ~150 lines. If a renderer grows, it
splits further under `renderers/<name>/` with dedicated subfiles.

---

## 3. Core contracts

Every pluggable unit is a named interface in `types.ts`.

### 3.1 `ChartRenderer`

```ts
export interface ChartRenderer<Shape = unknown> {
  /** String identifier. `"bar"`, `"line"`, `"my-radar"`. */
  readonly type: string;

  /** Data-shape projection — what this chart consumes. */
  transform(
    columns: Column[],
    rows: Row[],
    options: ChartOptions,
  ): ChartData<Shape>;

  /** React render function. Receives the transformed data + runtime
   *  deps (recharts module, resolved palette, resolved formatter). */
  render(ctx: ChartRenderContext<Shape>): ReactElement;

  /** Optional — static validation of the options. Returns warnings. */
  validate?(options: ChartOptions, columns: Column[]): string[];

  /** Optional — defaults this renderer wants layered under user
   *  options (e.g. `show-dots: true` for line, `false` for area). */
  readonly defaultOptions?: Partial<ChartOptions>;
}

export interface ChartData<Shape = unknown> {
  kind: "categorical" | "pie" | "scatter" | "custom";
  data: Shape;
  series: ChartSeriesConfig[];
  xLabel?: string;
  yLabel?: string;
}

export interface ChartRenderContext<Shape = unknown> {
  data: ChartData<Shape>;
  options: ChartOptions;
  height: number;
  /** Lazy-loaded recharts module. */
  recharts: typeof import("recharts");
  palette: PaletteResolver;
  formatter: FormatResolver;
}
```

Adding a new chart type is:

```ts
// renderers/radar.tsx
import { registerChartType } from "../core/registry";
import { transformCategorical } from "../transforms/categorical"; // shared util
export const radarRenderer: ChartRenderer = {
  type: "radar",
  transform: transformCategorical,
  render: (ctx) => <RadarChartInner {...ctx} />,
  defaultOptions: { showDots: false },
};
registerChartType(radarRenderer);
```

No other file changes. `Chart.tsx` picks it up automatically.

### 3.2 `PaletteResolver`

```ts
export interface PaletteResolver {
  /** Color for the i-th series (0-indexed). Wraps around. */
  series(i: number): string;
  /** Color by semantic tone name — `success` / `warn` / `danger` / … */
  tone(name: string): string;
  /** List of all tone names this palette supports. */
  tones(): string[];
}
```

Register palettes:

```ts
registerPalette("default", defaultPalette);
registerPalette("high-contrast", hcPalette);
```

Authors opt in via `colors=high-contrast` or by-name via
`colors=primary,danger,info` (resolved through `palette.tone()`).

### 3.3 `FormatResolver`

```ts
export type FormatSpec =
  | { kind: "auto" }                                 // pick based on col type
  | { kind: "number"; pattern?: string }
  | { kind: "currency"; code: string }
  | { kind: "percentage" }
  | { kind: "filesize" }
  | { kind: "date"; pattern?: string };

export interface FormatResolver {
  /** Format one value for one column; used in tooltips + axis ticks. */
  format(value: unknown, spec: FormatSpec, col?: Column): string;
}
```

Register additional formatters:

```ts
registerFormat("duration", (value) => formatSeconds(Number(value)));
```

Authors pick via `format:revenue=currency(USD)` (info-string) or
through an attribute on `<Chart>`.

### 3.4 `ChartOptions`

Everything the author configures. Every field is optional with a
sensible default; renderers layer their `defaultOptions` underneath.

```ts
export interface ChartOptions {
  type: ChartType;                           // renderer to use
  x?: string;                                // column for x-axis / category
  y?: string[];                              // columns for series; any length ≥ 1
  by?: string;                               // alternative to `y`: pivot by this column
  stacked?: boolean;
  horizontal?: boolean;
  smooth?: boolean;                          // line: monotone spline
  showDots?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showTable?: boolean;                       // a11y: render data as datagrid underneath
  xLabel?: string;
  yLabel?: string;
  title?: string;
  height?: number;
  colors?: string[];                         // tone names or hex
  formats?: Record<string, FormatSpec>;      // per-column format spec
  sort?: string;                             // "col" or "col:desc"
  limit?: number;                            // top-N after sort
  referenceLine?: number;
  // pie-specific
  name?: string;                             // alias for x on pie
  value?: string;                            // alias for y[0] on pie
  donut?: boolean;
  showTotal?: boolean;
  // CSV-ingest (shared with datagrid)
  src?: string;
  delimiter?: string;
  header?: boolean;
}
```

### 3.5 `ChartSeriesConfig`

Per-series rendering metadata, emitted by `renderer.transform()`:

```ts
export interface ChartSeriesConfig {
  /** The JS key in `data[i][key]` for categorical charts. */
  key: string;
  /** Display label shown in legend + tooltip. */
  label: string;
  /** Semantic tone or hex color. Empty → palette.series(i) chooses. */
  color?: string;
  /** Format spec for value in tooltip + data labels. */
  format?: FormatSpec;
}
```

---

## 4. Pipelines

### 4.1 Fenced block pipeline

```
```chart type=bar x=region y=revenue …
region,revenue
North,3600
South,2850
```

 ──▶ remarkCodeMeta preserves info-string
 ──▶ MDXViewer.components.code sees lang ∈ CHART_LANGS
 ──▶ <ChartBlock source meta options … />
 ──▶ parseInfoString(meta) → ChartOptions
 ──▶ ChartFromText parses CSV, hands (columns, rows, options) to Chart
 ──▶ Chart looks up renderer via registry.get(options.type)
 ──▶ renderer.transform(columns, rows, options) → ChartData
 ──▶ renderer.render(ctx) — returns JSX
```

### 4.2 Tag pipeline

```
<Chart src="./metrics.csv" type="line" x="month" y="users,revenue" />

 ──▶ MDXViewer.components.chart hands HTML attrs
 ──▶ attrsToOptions(p) → ChartOptions
 ──▶ ChartBlock → ChartFromText → Chart (same downstream)
```

### 4.3 `src=` handling (shared w/ datagrid's DataBlock)

- Absolute `https://…` → fetch directly.
- Relative `./foo.csv` → `AssetResolver.resolve()`.
- Missing → error card, not an empty chart.

---

## 5. Plug-in examples (for future-me)

### 5.1 Add a new chart type — radar

```ts
// packages/chart/src/renderers/radar.tsx
import type { ChartRenderer } from "../types";
import { transformCategorical } from "./shared/transforms";
import { registerChartType } from "../core/registry";

const renderer: ChartRenderer = {
  type: "radar",
  transform: transformCategorical,
  render: ({ data, recharts, palette, options }) => {
    const R = recharts;
    return (
      <R.RadarChart data={data.data as any[]}>
        <R.PolarGrid />
        <R.PolarAngleAxis dataKey={options.x} />
        <R.PolarRadiusAxis />
        {data.series.map((s, i) => (
          <R.Radar
            key={s.key}
            name={s.label}
            dataKey={s.key}
            stroke={s.color ?? palette.series(i)}
            fill={s.color ?? palette.series(i)}
            fillOpacity={0.3}
          />
        ))}
      </R.RadarChart>
    );
  },
};
registerChartType(renderer);
```

One file. No edits anywhere else. The lang ` ```radar ` and
`<Chart type="radar">` both start working automatically.

### 5.2 Add a custom formatter — duration

```ts
import { registerFormat } from "@filemark/chart";
registerFormat("duration", (value) => formatDuration(Number(value)));

// Author:
// format:buildTime=duration
```

### 5.3 Swap the palette

```ts
import { registerPalette } from "@filemark/chart";
registerPalette("brand", {
  series: (i) => BRAND_COLORS[i % BRAND_COLORS.length],
  tone: (n) => BRAND_TONES[n] ?? "currentColor",
  tones: () => Object.keys(BRAND_TONES),
});

// Author:
// <Chart colors="brand" … />
```

---

## 6. Public API surface

`src/index.ts` is the barrel — intentionally slim. Every export is
either a React component, a registration function, or a type:

```ts
// Components
export { Chart, type ChartProps } from "./components/Chart";
export { ChartFromText, type ChartFromTextProps } from "./components/ChartFromText";
export { ChartBlock, type ChartBlockProps } from "./components/ChartBlock";

// Plug-ins
export { registerChartType, getChartRenderer, getRegisteredTypes } from "./core/registry";
export { registerPalette, getPalette, DEFAULT_PALETTE } from "./core/palette";
export { registerFormat, getFormatter, DEFAULT_FORMATS } from "./core/format";

// Parsers (for host composition)
export { parseChartInfoString } from "./core/parseInfoString";
export { attrsToChartOptions } from "./core/attrsToOptions";

// Types
export type {
  ChartType,
  ChartOptions,
  ChartData,
  ChartRenderer,
  ChartRenderContext,
  ChartSeriesConfig,
  PaletteResolver,
  FormatResolver,
  FormatSpec,
} from "./types";
```

Consumers (`@filemark/mdx`, the chrome-ext, the playground) touch only
this surface. Internal modules stay internal.

---

## 7. Bundle strategy

| Import | Cost |
|---|---|
| `import { Chart } from "@filemark/chart"` | ~8 KB gz (everything except recharts) |
| First render of any chart | + ~50 KB gz (recharts dynamic import, cached on the window for the session) |
| Docs with zero charts | **0 KB** — Chart never mounts, recharts is never loaded |

`lazyRecharts.ts` memoizes the `import("recharts")` promise so multiple
charts on one page share one fetch.

---

## 8. Testing hooks (future)

Each renderer is pure (stateless, deterministic given (data, options)).
Easy to snapshot-test. Plan (not required for first ship):

- `packages/chart/src/__tests__/parse-info-string.test.ts` — grammar
- `packages/chart/src/__tests__/transforms.test.ts` — data reshape
- `packages/chart/src/__tests__/<type>.test.tsx` — snapshot tests
  per renderer

No test runner in the monorepo yet; just structure the code so tests
slot in without refactor when Vitest lands.

---

## 9. Non-goals (explicit)

Keep these out of v1 so the architecture doesn't bloat:

- **Cross-chart sync** — a dashboard of charts with a shared hover /
  brush. Feature creep. Revisit if the use case actually appears.
- **Edit-in-place** — clicking a data point to change the underlying
  CSV. This is a reader, not a spreadsheet.
- **Animations beyond recharts defaults** — no custom motion library.
- **Theming overrides per-chart** — one global palette set by
  `ThemeProvider`; authors can override series colors with
  `colors=…`. No nested theme contexts.

---

## 10. File-by-file build order

When the time comes to build — this is the exact order to avoid
half-implemented intermediate states:

1. `ARCHITECTURE.md` ← this file (done first so the plan is the contract).
2. `package.json`, `tsconfig.json`, `tsup.config.ts`.
3. `types.ts` — every interface from §3.
4. `core/registry.ts` + `core/palette.ts` + `core/format.ts`
   + `core/lazyRecharts.ts` (empty registries + default entries).
5. `core/parseInfoString.ts` — extends datagrid's tokenizer.
6. `core/attrsToOptions.ts` — mirrors datagrid's pattern.
7. `components/ChartContainer.tsx` + `components/ChartLoading.tsx`.
8. `renderers/shared/*` — CustomTooltip, AxisTick.
9. `renderers/bar.tsx` — first concrete renderer + its transform.
10. `components/Chart.tsx` — registry lookup + render.
11. `components/ChartFromText.tsx` + `components/ChartBlock.tsx`.
12. `renderers/line.tsx`, then `pie.tsx`, then `area.tsx`.
13. `components/TableFallback.tsx` — a11y data-table fallback.
14. `index.ts` barrel.
15. MDX integration (`@filemark/mdx/src/ChartBlock.tsx`
    + the new lang-branch + tag handler in `MDXViewer.tsx`).
16. Showcase: `examples/chart-full.md` + `examples/assets/metrics.csv`.
17. Playground: add to `apps/playground/src/examples/index.ts`.
18. Tech ref: `docsi/CHART.md` (written alongside the final code).
19. Typecheck + build across every workspace. Smoke-test.
20. Commit — one focused commit per PR-sized slice (scaffold + contracts;
    first renderer end-to-end; remaining renderers; MDX + showcase).

---

## 11. How to change this doc

- New chart type → no doc edit. Registration is the source of truth.
- New pluggable concept (e.g. custom axis scale) → add its interface to
  `types.ts`, its registry under `core/`, its usage in §3 and §5.
- Architectural decision that touches multiple files → add a short
  section; don't rewrite.
