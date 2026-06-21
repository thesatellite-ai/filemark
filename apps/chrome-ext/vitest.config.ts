import { defineConfig } from "vitest/config";

// Unit tests cover the PURE logic of the revision feature (hash, source diff,
// reading-diff block algorithms) — no DOM, so a node environment is enough and
// fast. React component rendering is verified by `tsc --noEmit` + the build.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
