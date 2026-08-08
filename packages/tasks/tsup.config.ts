import { defineConfig } from "tsup";

// @filemark/tasks — markdown-native task parser + React context.
// Pure library; no remark/rehype deps (we operate on raw text so the
// parser can be reused outside any specific markdown pipeline —
// filemark/mdx walks mdast and feeds us the underlying source line).
export default defineConfig({
  // "." = full barrel (incl. React context); "./pure" = parser-only, React-free
  // entry for non-React hosts (see src/pure.ts).
  entry: ["src/index.ts", "src/pure.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "@filemark/core"],
  target: "es2022",
  splitting: false,
});
