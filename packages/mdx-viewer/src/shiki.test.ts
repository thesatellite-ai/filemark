/// <reference types="node" />
/**
 * Regression: one pathological code block must not freeze the page.
 *
 * Shiki 4.3's Go grammar backtracks exponentially inside a single RegExp exec on
 * struct fields followed by a comment/quote (see shiki.ts). These tests drive the
 * REAL path — `highlight()` → HighlightPool → the worker bundle built from
 * src/shiki.worker.ts (same tsup settings as the shipped dist/shiki.worker.js) —
 * with the worker hosted on node `worker_threads` instead of a DOM Worker.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Worker as NodeWorker } from "node:worker_threads";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "tsup";
import { highlight, setHighlightWorkerFactory } from "./shiki";
import type { WorkerLike } from "./shikiPool";
import type { FromWorker as FromWorkerMsg } from "./shikiProtocol";

// Runs the classic-script worker bundle in a node worker with a DOM-ish `self`.
const BOOT = `
const { parentPort, workerData } = require("node:worker_threads");
const fs = require("node:fs");
const vm = require("node:vm");
globalThis.self = globalThis;
globalThis.postMessage = (m) => parentPort.postMessage(m);
parentPort.on("message", (d) => globalThis.onmessage && globalThis.onmessage({ data: d }));
vm.runInThisContext(fs.readFileSync(workerData.file, "utf8"));
`;

function nodeWorker(file: string): WorkerLike {
  const w = new NodeWorker(BOOT, { eval: true, workerData: { file } });
  const like: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage: (m) => w.postMessage(m),
    terminate: () => void w.terminate(),
  };
  w.on("message", (data: FromWorkerMsg) => like.onmessage?.({ data }));
  w.on("error", (e: Error) => like.onerror?.(e));
  return like;
}

// The trigger and control fences live in the regression doc so the sample a
// human opens in the extension and the sample this test runs cannot drift.
// Fences are keyed by their info string: ```go freeze / ```go colour.
const REGRESSION_MD = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../examples/regressions/code-highlight-freeze.md",
);

function fences(kind: "freeze" | "colour"): string[] {
  const md = readFileSync(REGRESSION_MD, "utf8");
  const re = new RegExp("^```go " + kind + "\\n([\\s\\S]*?)\\n```$", "gm");
  return [...md.matchAll(re)].map((m) => m[1]);
}

const FREEZE = fences("freeze");
const COLOUR = fences("colour");
const [BAD_GO, BAD_GO_16A] = FREEZE;
const [GOOD_GO] = COLOUR;

let outDir = "";

beforeAll(async () => {
  outDir = mkdtempSync(path.join(tmpdir(), "fm-shiki-worker-"));
  await build({
    config: false,
    silent: true,
    entry: { "shiki.worker": path.join(path.dirname(fileURLToPath(import.meta.url)), "shiki.worker.ts") },
    outDir,
    format: ["iife"],
    platform: "browser",
    target: "es2022",
    noExternal: [/.*/],
    dts: false,
    minify: true,
    outExtension: () => ({ js: ".js" }),
  });
  const file = path.join(outDir, "shiki.worker.js");
  setHighlightWorkerFactory(() => nodeWorker(file));
}, 60_000);

afterAll(() => {
  setHighlightWorkerFactory(null);
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

const isColoured = (html: string) =>
  !html.includes("fv-shiki-plain") && /style="color:#/i.test(html);

describe("shiki highlighting off the main thread", () => {
  it("reads the regression fences from examples/regressions", () => {
    expect(FREEZE.length).toBeGreaterThanOrEqual(5);
    expect(COLOUR.length).toBeGreaterThanOrEqual(1);
    expect(BAD_GO).toContain('From SettingsScope /* or "process" */ }');
    expect(BAD_GO_16A).toContain("aaaaaaaaaaaaaaaa b; c d; e f /* x */");
  });

  it("colours the control Go block", async () => {
    const html = await highlight(GOOD_GO, "go", true);
    expect(isColoured(html)).toBe(true);
  }, 30_000);

  it("falls back to plain text for the two core triggers in under 2s", async () => {
    const t0 = performance.now();
    const [a, b] = await Promise.all([
      highlight(BAD_GO, "go", true),
      highlight(BAD_GO_16A, "go", false),
    ]);
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(2000);
    expect(a).toContain("fv-shiki-plain");
    expect(a).toContain("/* or &quot;process&quot; */");
    expect(b).toContain("fv-shiki-plain");
    expect(b).toContain("aaaaaaaaaaaaaaaa b; c d; e f /* x */");
  }, 30_000);

  it("bounds every trigger fence in the regression doc", async () => {
    // Fresh theme so nothing comes from the cache filled above.
    const t0 = performance.now();
    const out = await Promise.all(FREEZE.map((code) => highlight(code, "go", false)));
    const elapsed = performance.now() - t0;
    // 2 workers, ~0.75 s deadline each: a handful of runaway blocks settle in
    // a few seconds instead of minutes-to-hours.
    expect(elapsed).toBeLessThan(5000);
    for (const html of out) expect(html).toContain("fv-shiki-plain");
  }, 30_000);

  it("keeps colouring after workers were recycled", async () => {
    const html = await highlight(GOOD_GO + "\n// again", "go", false);
    expect(isColoured(html)).toBe(true);
  }, 30_000);
});
