import { defineConfig } from "vitest/config";

// Pure-logic unit tests only (task toggle, scroll interpolation math, zoom
// clamp) — node environment, no DOM and no vscode API. The host/webview wiring
// is verified by `tsc --noEmit` + the build.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
