import { defineConfig } from "tsup";

// tsup doesn't bundle .css imports through the JS entry (CSS imports
// would be "injected" into a JS file, which isn't what we want for a
// themable stylesheet shipped alongside the package). So we copy
// src/styles.css → dist/styles.css via onSuccess. Consumers import it
// explicitly: `import "@filemark/mdx/styles.css"`. Same for the GitHub-preview
// sheet (github.css → @filemark/mdx/github.css), loaded only in GitHub mode.
//
// Second build: the highlight Web Worker (src/shiki.worker.ts) as ONE
// self-contained classic script, dist/shiki.worker.js — shiki core, JS regex
// engine, themes and every grammar bundled in, no imports — so it starts the
// same way in every host: by URL in the Chrome extension, from a fetched Blob in
// the VS Code webview. index.js references it with
// `new URL("./shiki.worker.js", import.meta.url)`, which the consumer's Vite
// build emits as an asset. `clean` is off for both builds (they run in parallel
// and would wipe each other); the package `build` script clears dist first.
export default defineConfig([{
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: false,
  external: [
    "react",
    "react-dom",
    "@filemark/core",
    "@filemark/chart",
    "@filemark/datagrid",
    "@filemark/kanban",
    "@filemark/tasks",
    "yaml",
    "mermaid",
    "markmap-lib",
    "markmap-view",
    "markmap-common",
    "@pierre/trees",
    /^@pierre\/trees\/.*/,
    "class-variance-authority",
    "clsx",
    "tailwind-merge",
    "db-schema-toolkit",
    /^db-schema-toolkit\/.*/,
  ],
  target: "es2022",
  splitting: false,
  onSuccess:
    "cp src/styles.css dist/styles.css && cp src/github.css dist/github.css",
}, {
  entry: { "shiki.worker": "src/shiki.worker.ts" },
  format: ["iife"],
  platform: "browser",
  target: "es2022",
  noExternal: [/.*/],
  dts: false,
  sourcemap: false,
  minify: true,
  clean: false,
  splitting: false,
  outExtension: () => ({ js: ".js" }),
}]);
