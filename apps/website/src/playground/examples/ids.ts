// Gallery example ids — a PLAIN string list with no `?raw` / content imports,
// so `vite.config.ts` can import it to prerender every /demo/gallery/<id> page
// (the full content lives in ./index.ts, which can't be imported from the Vite
// config because it pulls in `*.md?raw`). `index.ts` asserts these stay in
// sync, so adding an example there without updating this list fails the build.
export const EXAMPLE_IDS = [
  "gfm-full",
  "math-full",
  "gfm-emoji-verify",
  "emoji-cheatsheet",
  "datagrid-full",
  "datagrid-intro",
  "playground-starter",
  "chart-full",
  "kanban-full",
  "stats-adr-full",
  "tasks-full",
  "planning-v2-full",
  "planning-v2-tier2",
  "planning-v2-tier3",
  "mindmap-full",
  "richdocs-tier1",
  "richdocs-tier2",
  "richdocs-tier3",
  "showcase",
  "schema-sql",
  "schema-prisma",
  "schema-dbml",
] as const;
