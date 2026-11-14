/**
 * Highlight Web Worker entry. Built by tsup as a SELF-CONTAINED classic script
 * (dist/shiki.worker.js: shiki core + JS regex engine + themes + grammars, no
 * imports) so it loads the same way everywhere: by URL in the Chrome extension,
 * and from a fetched Blob in the VS Code webview (whose resource origin differs
 * from the page origin, so a URL worker is refused there).
 *
 * Jobs run strictly one at a time. Before each synchronous tokenize it posts
 * `start`, which arms the main thread's per-block deadline; if a grammar regex
 * backtracks catastrophically the main thread terminates this worker and shows
 * the block as plain text. See shikiPool.ts.
 */

import { ensureLang, prepare } from "./shikiEngine";
import type { FromWorker, ToWorker } from "./shikiProtocol";

const ctx = self as unknown as {
  onmessage: ((e: { data: ToWorker }) => void) | null;
  postMessage(msg: FromWorker): void;
};

let queue: Promise<void> = Promise.resolve();

async function handle(msg: ToWorker): Promise<void> {
  if (msg.type === "warm") {
    await Promise.all(msg.langs.map((l) => ensureLang(l)));
    return;
  }
  let tokenize: (code: string) => string;
  try {
    tokenize = await prepare(msg.lang, msg.theme);
  } catch {
    ctx.postMessage({ type: "error", id: msg.id });
    return;
  }
  ctx.postMessage({ type: "start", id: msg.id });
  try {
    ctx.postMessage({ type: "done", id: msg.id, html: tokenize(msg.code) });
  } catch {
    ctx.postMessage({ type: "error", id: msg.id });
  }
}

ctx.onmessage = (e) => {
  queue = queue.then(() => handle(e.data)).catch(() => {});
};
