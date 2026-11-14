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
import { mkdtempSync, rmSync } from "node:fs";
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

const BAD_GO =
  'type EnvSetting struct{ Name string; Value EnvValue; From SettingsScope /* or "process" */ }';
const BAD_GO_16A = "type E struct{ aaaaaaaaaaaaaaaa b; c d; e f /* x */ }";
const GOOD_GO = `package main

import "fmt"

type Point struct {
\tX, Y int
}

func main() {
\tfmt.Println(Point{1, 2})
}`;

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
  it("colours a normal Go block", async () => {
    const html = await highlight(GOOD_GO, "go", true);
    expect(isColoured(html)).toBe(true);
  }, 30_000);

  it("falls back to plain text for pathological Go blocks in under 2s", async () => {
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

  it("keeps colouring after a worker was recycled", async () => {
    const html = await highlight(GOOD_GO + "\n// again", "go", false);
    expect(isColoured(html)).toBe(true);
  }, 30_000);
});
