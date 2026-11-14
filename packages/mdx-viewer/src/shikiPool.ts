/**
 * Main-thread side of off-thread highlighting: a small pool of highlight
 * workers with a per-block deadline.
 *
 * Why a worker and not a timeout: Shiki tokenizes synchronously, and a few
 * grammar regexes backtrack exponentially on ordinary input (Go struct fields
 * followed by a comment take minutes to hours inside ONE `RegExp.exec`). JS
 * cannot interrupt that on the thread running it, and shiki's per-line
 * `tokenizeTimeLimit` is only checked between regex calls. A worker can be
 * `terminate()`d from outside, mid-exec, so a runaway block costs at most its
 * deadline and the page never freezes.
 *
 * Flow per block: post → worker loads grammar → worker posts `start` → we arm a
 * deadline timer → `done` resolves with HTML, or the timer fires: terminate that
 * worker, resolve the block as `null` (caller renders plain text), and resend
 * the worker's other queued blocks to a fresh worker.
 */

import type { FromWorker, ShikiTheme, ToWorker } from "./shikiProtocol";

/** The subset of the DOM `Worker` API the pool uses (lets tests plug in node workers). */
export interface WorkerLike {
  postMessage(msg: ToWorker): void;
  terminate(): void;
  onmessage: ((e: { data: FromWorker }) => void) | null;
  onerror: ((e: unknown) => void) | null;
}

export type WorkerFactory = () => WorkerLike | Promise<WorkerLike>;

export interface PoolOptions {
  /** How many workers may tokenize in parallel. */
  size: number;
  /** Tokenize deadline for a block, measured from the worker's `start`. */
  deadlineMs: (code: string) => number;
  /**
   * Max wait for a block to reach `start` (engine/grammar load). Only trips if
   * the worker is wedged or failed to boot; the block then renders plain.
   */
  startTimeoutMs: number;
}

interface Job {
  id: number;
  code: string;
  lang: string;
  theme: ShikiTheme;
  resolve: (html: string | null) => void;
  timer: ReturnType<typeof setTimeout> | null;
}

interface Slot {
  worker: Promise<WorkerLike> | null;
  jobs: Map<number, Job>;
}

/**
 * Default tokenize deadline: generous for real code (shiki does ~thousands of
 * lines/sec) yet bounded so a catastrophic regex costs well under a second for
 * a normal-sized block. Scales with block length so huge legit files (raw view
 * of a big source file) still get coloured.
 */
export function defaultDeadlineMs(code: string): number {
  let lines = 1;
  for (let i = 0; i < code.length; i++) if (code.charCodeAt(i) === 10) lines++;
  return Math.min(750 + lines, 5000);
}

export class HighlightPool {
  private slots: Slot[];
  private nextId = 1;
  /** Set once the factory has failed: every later block renders plain. */
  private broken = false;
  /** True once any worker has answered — after that a crash is per-worker, not fatal. */
  private everWorked = false;

  constructor(
    private readonly spawn: WorkerFactory,
    private readonly opts: PoolOptions,
  ) {
    this.slots = Array.from({ length: Math.max(1, opts.size) }, () => ({
      worker: null,
      jobs: new Map(),
    }));
  }

  /** Preload grammars in the first worker (spawning it) so blocks start warm. */
  warm(langs: string[]): void {
    if (this.broken || langs.length === 0) return;
    void this.ensureWorker(this.slots[0])
      .then((w) => w.postMessage({ type: "warm", langs }))
      .catch(() => {});
  }

  /** Highlight one block. Resolves `null` on timeout/failure → render plain. */
  highlight(code: string, lang: string, theme: ShikiTheme): Promise<string | null> {
    if (this.broken) return Promise.resolve(null);
    return new Promise((resolve) => {
      const job: Job = { id: this.nextId++, code, lang, theme, resolve, timer: null };
      // Least-loaded slot; ties go to the lowest index so a second worker is only
      // spawned when the first is already busy.
      let slot = this.slots[0];
      for (const s of this.slots) if (s.jobs.size < slot.jobs.size) slot = s;
      slot.jobs.set(job.id, job);
      this.send(slot, job);
    });
  }

  /** Terminate every worker; pending blocks resolve plain. */
  dispose(): void {
    for (const slot of this.slots) this.recycle(slot, false);
  }

  private send(slot: Slot, job: Job): void {
    this.arm(job, this.opts.startTimeoutMs, slot);
    this.ensureWorker(slot)
      .then((w) => {
        if (slot.jobs.get(job.id) !== job) return; // settled while booting
        w.postMessage({
          type: "highlight",
          id: job.id,
          code: job.code,
          lang: job.lang,
          theme: job.theme,
        });
      })
      .catch(() => this.fail(slot));
  }

  private arm(job: Job, ms: number, slot: Slot): void {
    if (job.timer) clearTimeout(job.timer);
    job.timer = setTimeout(() => this.timeout(slot, job), ms);
  }

  private ensureWorker(slot: Slot): Promise<WorkerLike> {
    if (slot.worker) return slot.worker;
    const p = Promise.resolve()
      .then(() => this.spawn())
      .then((w) => {
        w.onmessage = (e) => {
          if (slot.worker === p) this.onMessage(slot, e.data);
        };
        w.onerror = () => {
          if (slot.worker === p) this.fail(slot);
        };
        return w;
      });
    slot.worker = p;
    return p;
  }

  private onMessage(slot: Slot, msg: FromWorker): void {
    this.everWorked = true;
    const job = slot.jobs.get(msg.id);
    if (!job) return;
    if (msg.type === "start") {
      this.arm(job, this.opts.deadlineMs(job.code), slot);
      return;
    }
    this.settle(slot, job, msg.type === "done" ? msg.html : null);
  }

  private settle(slot: Slot, job: Job, html: string | null): void {
    if (job.timer) clearTimeout(job.timer);
    slot.jobs.delete(job.id);
    job.resolve(html);
  }

  /** A block blew its deadline: kill its worker, render it plain, requeue the rest. */
  private timeout(slot: Slot, job: Job): void {
    if (slot.jobs.get(job.id) !== job) return;
    this.settle(slot, job, null);
    this.recycle(slot, true);
  }

  /** The worker died or could not be created. */
  private fail(slot: Slot): void {
    if (!slot.worker) return;
    if (this.everWorked) {
      // One worker crashed (e.g. out of memory on a giant block): its blocks
      // render plain, the next block gets a fresh worker.
      this.recycle(slot, false);
      return;
    }
    // A worker that errors before ever being usable means workers don't work in
    // this host: stop trying and render plain rather than loop on spawn.
    this.broken = true;
    console.warn("[filemark] code highlighting worker unavailable; showing plain code");
    for (const s of this.slots) this.recycle(s, false);
  }

  private recycle(slot: Slot, requeue: boolean): void {
    const old = slot.worker;
    slot.worker = null;
    old?.then((w) => w.terminate()).catch(() => {});
    const pending = [...slot.jobs.values()];
    if (!requeue || this.broken) {
      for (const job of pending) this.settle(slot, job, null);
      return;
    }
    for (const job of pending) this.send(slot, job);
  }
}
