import { defineConfig } from "tsup";

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
    "@filemark/datagrid",
    // recharts is dynamic-imported at runtime via lazyRecharts.ts, never
    // bundled into the package output. The host (chrome-ext / playground)
    // installs it as a transitive dep via @filemark/chart.
    "recharts",
  ],
  target: "es2022",
  splitting: false,
});
