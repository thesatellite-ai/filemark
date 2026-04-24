import { defineConfig } from "tsup";

// tsup doesn't bundle .css imports through the JS entry (CSS imports
// would be "injected" into a JS file, which isn't what we want for a
// themable stylesheet shipped alongside the package). So we copy
// src/styles.css → dist/styles.css via onSuccess. Consumers import it
// explicitly: `import "@filemark/mdx/styles.css"`.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
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
    "db-schema-toolkit",
    /^db-schema-toolkit\/.*/,
  ],
  target: "es2022",
  splitting: false,
  onSuccess: "cp src/styles.css dist/styles.css",
});
