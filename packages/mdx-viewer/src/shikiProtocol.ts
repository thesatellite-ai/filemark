/**
 * Message protocol between the main thread (shikiPool.ts) and the highlight
 * worker (shiki.worker.ts). Kept in its own module so both sides share one
 * definition and the worker bundle pulls in no React/viewer code.
 */

export type ShikiTheme = "github-dark" | "github-light";

/** Main thread → worker. */
export type ToWorker =
  /** Preload these grammars so the first real block tokenizes without a load. */
  | { type: "warm"; langs: string[] }
  /** Tokenize one block. `id` is unique per pool. */
  | { type: "highlight"; id: number; code: string; lang: string; theme: ShikiTheme };

/** Worker → main thread. */
export type FromWorker =
  /**
   * Sent right before the SYNCHRONOUS tokenize of job `id` begins (grammar
   * already loaded). The main thread starts that block's deadline on receipt, so
   * cold engine/grammar loading never counts against the deadline.
   */
  | { type: "start"; id: number }
  | { type: "done"; id: number; html: string }
  /** Tokenizing threw; the caller falls back to plain text. */
  | { type: "error"; id: number };
