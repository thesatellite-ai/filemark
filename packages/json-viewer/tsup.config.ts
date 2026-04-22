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
    "jsonc-parser",
    "@uiw/react-json-view",
    /^@uiw\/react-json-view\/.*/,
  ],
  target: "es2022",
  splitting: false,
});
