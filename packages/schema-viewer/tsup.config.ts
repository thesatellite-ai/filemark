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
    "@filemark/mdx",
    "db-schema-toolkit",
    /^db-schema-toolkit\/.*/,
  ],
  target: "es2022",
  splitting: false,
});
