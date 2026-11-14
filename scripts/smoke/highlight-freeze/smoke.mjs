/**
 * Smoke check for the code-highlight freeze regression (fix e477dfe).
 *
 * Loads the unpacked Chrome extension in headless Chromium, opens the viewer
 * with examples/regressions/code-highlight-freeze.md (passed inline through the
 * viewer's `#fv-inline=` intake, so no file-URL permission is needed) and fails
 * unless, within a few seconds:
 *   1. the doc's end-marker text is visible,
 *   2. the main thread still answers (a setTimeout(0) round-trip) after the
 *      highlighter has had time to chew on the trigger fences,
 *   3. every `go freeze` block settled to the plain fallback and the
 *      `go colour` block is coloured.
 * Before e477dfe the renderer is stuck inside one regex exec, so 1 or 2 times out.
 *
 * Usage (inside mcr.microsoft.com/playwright:v1.64.0-noble, see Taskfile
 * `smoke:highlight-freeze`): node smoke.mjs <unpacked-ext-dir> <regression.md>
 * Exit 0 = pass, 1 = fail. Prints one JSON line with timings.
 */

import { chromium } from "playwright-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [extDir, mdPath] = process.argv.slice(2);
if (!extDir || !mdPath) {
  console.error("usage: node smoke.mjs <unpacked-ext-dir> <regression.md>");
  process.exit(2);
}

const END_MARKER = "highlight-freeze-regression-end";
const TEXT_TIMEOUT_MS = 8000;
const SETTLE_MS = 4000; // let the workers hit their deadlines
const RESPONSIVE_TIMEOUT_MS = 3000;

const result = { pass: false, step: "launch" };
const finish = (code) => {
  console.log(JSON.stringify(result));
  // A frozen renderer can wedge browser shutdown; don't wait for it.
  process.exit(code);
};
// Hard stop for the whole run.
setTimeout(() => {
  result.error = `overall timeout at step ${result.step}`;
  finish(1);
}, 60_000).unref();

function withTimeout(p, ms, what) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out after ${ms} ms`)), ms)),
  ]);
}

try {
  const md = fs.readFileSync(mdPath, "utf8");
  const freezeCount = (md.match(/^```go freeze$/gm) ?? []).length;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "fm-smoke-"));
  const ctx = await chromium.launchPersistentContext(profile, {
    channel: "chromium", // full Chromium (new headless) — headless-shell can't load extensions
    headless: true,
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
  });
  result.step = "extension";
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
  const id = new URL(sw.url()).host;

  const payload = Buffer.from(
    unescape(encodeURIComponent(JSON.stringify({ url: "file:///regression/code-highlight-freeze.md", content: md }))),
  ).toString("base64");
  const page = await ctx.newPage();
  const t0 = Date.now();
  result.step = "goto";
  await withTimeout(page.goto(`chrome-extension://${id}/src/app/index.html#fv-inline=${payload}`), TEXT_TIMEOUT_MS, "navigation");

  result.step = "text-visible";
  await page.getByText(END_MARKER).waitFor({ timeout: TEXT_TIMEOUT_MS });
  result.textVisibleMs = Date.now() - t0;

  result.step = "responsive";
  await new Promise((r) => setTimeout(r, SETTLE_MS));
  result.tickMs = await withTimeout(
    page.evaluate(() => new Promise((r) => { const s = performance.now(); setTimeout(() => r(performance.now() - s), 0); })),
    RESPONSIVE_TIMEOUT_MS,
    "main-thread round-trip",
  );

  result.step = "blocks";
  const blocks = await withTimeout(
    page.$$eval(".fv-code-block", (els) => els.map((e) => ({
      plain: !!e.querySelector(".fv-shiki-plain"),
      coloured: !!e.querySelector('.fv-code-shiki span[style*="color"]'),
    }))),
    RESPONSIVE_TIMEOUT_MS,
    "block inspection",
  );
  result.blocks = blocks.map((b) => (b.plain ? "plain" : b.coloured ? "coloured" : "pending"));
  const plain = blocks.filter((b) => b.plain).length;
  const coloured = blocks.filter((b) => b.coloured).length;
  if (plain !== freezeCount || coloured < 1) {
    throw new Error(`expected ${freezeCount} plain + >=1 coloured blocks, got ${plain} plain, ${coloured} coloured`);
  }
  result.step = "done";
  result.pass = true;
  finish(0);
} catch (e) {
  result.error = String(e?.message ?? e).split("\n")[0];
  finish(1);
}
