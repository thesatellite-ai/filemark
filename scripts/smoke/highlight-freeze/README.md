# Smoke: code-highlight freeze

Headless-Chromium check for [`examples/regressions/code-highlight-freeze.md`](../../../examples/regressions/code-highlight-freeze.md) (fix `e477dfe`). It loads the unpacked extension, opens the regression doc in the viewer and fails if the text isn't visible, the page stops responding, or the trigger blocks don't settle to plain text within a few seconds.

Needs Docker (rootless is fine) with the `mcr.microsoft.com/playwright:v1.64.0-noble` image, which carries Chromium and its system libraries. The host only needs `npm` for `playwright-core`.

```bash
task build                      # or point EXT at any unpacked build
task smoke:highlight-freeze     # EXT=apps/chrome-ext/dist by default
task smoke:highlight-freeze EXT=/path/to/other/dist
```

It prints one JSON line (`pass`, `textVisibleMs`, `tickMs`, block states, or `error` with the failing step) and exits 0 on pass, 1 on fail.
