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
    "@tanstack/react-table",
    "@tanstack/react-virtual",
    "papaparse",
  ],
  target: "es2022",
  splitting: false,
});
