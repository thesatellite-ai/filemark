# @filemark/playground

Standalone web demo for Filemark. Two modes:

- **Gallery** — pick a bundled example from the sidebar or drop your own
  `.md` file. The whole render pipeline runs (MDX body, fenced datagrids,
  rich column types, grouping, search).
- **Playground** — live editor on the left, preview on the right. Your
  source encodes into `?src=<base64>` so you can share the URL.

Also doubles as the **portability proof** for `@filemark/mdx` +
`@filemark/datagrid` — they render here with no Chrome / MV3 context,
just React + localStorage + fetch.

## Run locally

```bash
pnpm --filter @filemark/playground dev
```

## Build

```bash
pnpm --filter @filemark/playground build
# output → apps/playground/dist/
```

## Deploy to Vercel

Point Vercel at the monorepo root, let it pick up `vercel.json`:

- `buildCommand` = `pnpm -w build:packages && pnpm --filter @filemark/playground build`
- `outputDirectory` = `apps/playground/dist`
- SPA rewrites send every path to `/index.html` (hash routing)

## Adapters (web implementations of the viewer interfaces)

- `LocalStorageAdapter` — `StorageAdapter` wrapping `localStorage`. Grid
  state (sort / filter / sizing / density / grouping), task-list
  toggles, etc. persist per-origin.
- `BundledAssetResolver` — `AssetResolver` that resolves relative
  paths (`./sales.csv` etc.) against assets bundled at build time via
  Vite `import.meta.glob`. Absolute URLs bypass this entirely (datagrid
  fetches them directly).

## Adding a new example

1. Drop the file in `filemark/examples/` (so it's also exercised by the
   extension).
2. Raw-import it in `src/examples/index.ts` and append to `EXAMPLES`.
3. If the example references sibling assets via `./path`, copy them
   into `src/examples/assets/`.
