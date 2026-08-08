import { defineConfig } from "vitest/config";

// Pure-logic unit tests only (frontmatter parsing, math-fence normalization) —
// node environment, no DOM. React component rendering is verified by the build.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
