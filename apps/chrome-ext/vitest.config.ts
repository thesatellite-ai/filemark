import { defineConfig } from "vitest/config";

// Default environment is `node` (fast) for the pure logic — revision hash,
// source/reading diff, compare, store, time. DOM-dependent suites opt into
// jsdom per-file with a `// @vitest-environment jsdom` docblock (e.g. the note
// highlight engine in notes/highlight.test.ts). React component rendering is
// verified by `tsc --noEmit` + the build.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
