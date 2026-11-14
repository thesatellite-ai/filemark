/**
 * Code-block highlighting API used by CodeBlock / RawView.
 *
 * All tokenizing happens OFF the main thread in a pool of Web Workers
 * (shikiPool.ts + shiki.worker.ts), each block under a deadline. On timeout the
 * worker is terminated and the block renders as plain escaped text; the rest of
 * the page is never blocked.
 *
 * Why: Shiki's JS regex engine translates grammar patterns to native `RegExp`,
 * and some patterns backtrack exponentially on ordinary code. Incident
 * 2026-11-14: Shiki 4.3's Go grammar rule
 * `struct_variables_types_fields` (`(?<=\{)((?:\s*(?:(?:\w+,\s*)+{0,1}\w+\s+)?…)+)\s*(?=})`)
 * never reaches `}` when a `/*`, quote or `/` sits before it, e.g.
 *     type EnvSetting struct{ Name string; Value EnvValue; From SettingsScope /* or "process" *\/ }
 * and one exec runs for minutes to hours. Previously `codeToHtml` ran on the main
 * thread, so the whole tab froze forever. A try/catch or shiki's
 * `tokenizeTimeLimit` cannot help — the time is spent inside ONE regex exec.
 * (Earlier, shiki <= 2.5 did the same on far more Go code — docsi/INCIDENTS.md
 * 2026-06-29 — so keep shiki >= 4.3.)
 *
 * Trade-off: a block not yet in the cache first paints as plain text and gains
 * colour a moment later when its worker answers (the old warm main-thread path
 * coloured on first paint, at the cost of being able to freeze the page).
 * Results are cached, so re-renders, theme flips back and tab switches are
 * instant.
 */

import { HighlightPool, defaultDeadlineMs, type WorkerFactory, type WorkerLike } from "./shikiPool";
import type { ShikiTheme } from "./shikiProtocol";

const THEME_DARK: ShikiTheme = "github-dark";
const THEME_LIGHT: ShikiTheme = "github-light";
const PLAINTEXT = "text";

/**
 * Spawn a highlight worker. `new URL(…, import.meta.url)` is rewritten by the
 * consumer's bundler (Vite) to the emitted worker asset. Chrome extension pages
 * share the asset's origin, so a URL worker works. The VS Code webview serves
 * assets from a different origin than the page, so `new Worker(url)` throws a
 * SecurityError there; we then fetch the (self-contained) script and start it
 * from a Blob URL instead (webview CSP allows `connect-src` + `worker-src blob:`).
 */
function defaultWorkerFactory(): WorkerLike | Promise<WorkerLike> {
  const url = new URL("./shiki.worker.js", import.meta.url);
  try {
    return new Worker(url) as unknown as WorkerLike;
  } catch {
    return fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`worker fetch ${r.status}`);
        return r.text();
      })
      .then((src) => {
        const blobUrl = URL.createObjectURL(
          new Blob([src], { type: "text/javascript" }),
        );
        return new Worker(blobUrl) as unknown as WorkerLike;
      });
  }
}

let factory: WorkerFactory = defaultWorkerFactory;
let pool: HighlightPool | null = null;

function getPool(): HighlightPool {
  pool ??= new HighlightPool(factory, {
    size: 2,
    deadlineMs: defaultDeadlineMs,
    startTimeoutMs: 20_000,
  });
  return pool;
}

/**
 * Swap how highlight workers are created (tests run them on node
 * `worker_threads`; a host with its own bundling can point at its worker URL).
 * Disposes the current pool and clears the cache.
 */
export function setHighlightWorkerFactory(f: WorkerFactory | null): void {
  pool?.dispose();
  pool = null;
  HL_CACHE.clear();
  factory = f ?? defaultWorkerFactory;
}

/**
 * Pre-load a document's grammars in the worker so its blocks tokenize as soon
 * as they are submitted. Fire-and-forget.
 */
export async function warm(langs: Iterable<string>): Promise<void> {
  const unique = [
    ...new Set([...langs].map((l) => (l || PLAINTEXT).toLowerCase())),
  ];
  getPool().warm(unique);
}

// LRU cache of highlighted HTML keyed by `<lang>:<theme>:<codeHash>`. Bounded so
// giant docs with hundreds of fences don't balloon memory. Re-highlighting the
// same block (theme unchanged, re-render, tab switch back) hits this cache.
// Plain fallbacks for blocks that blew their deadline are cached too, so a
// runaway block is attempted once, not on every render.
const HL_CACHE = new Map<string, string>();
const HL_CACHE_MAX = 500;

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function cacheKey(code: string, lang: string, isDark: boolean): string {
  return `${lang || PLAINTEXT}:${isDark ? "d" : "l"}:${fnv1a(code)}`;
}

function touch(key: string, value: string): string {
  HL_CACHE.delete(key);
  HL_CACHE.set(key, value);
  return value;
}

function store(key: string, html: string): string {
  touch(key, html);
  if (HL_CACHE.size > HL_CACHE_MAX) {
    const oldest = HL_CACHE.keys().next().value;
    if (oldest !== undefined) HL_CACHE.delete(oldest);
  }
  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Uncoloured fallback in the same shape shiki emits (`pre.shiki > code >
 * span.line`), so the code-block CSS applies unchanged. Marked
 * `fv-shiki-plain` so it is identifiable (and testable).
 */
export function plainHtml(code: string): string {
  const lines = code
    .split("\n")
    .map((l) => `<span class="line">${escapeHtml(l)}</span>`)
    .join("\n");
  return `<pre class="shiki fv-shiki-plain" tabindex="0"><code>${lines}</code></pre>`;
}

/**
 * Return already-highlighted HTML for this exact (code, lang, theme) if cached,
 * else null. Pure cache read — cheapest first-render probe.
 */
export function getCachedHighlight(
  code: string,
  lang: string,
  isDark: boolean,
): string | null {
  const key = cacheKey(code, lang, isDark);
  const hit = HL_CACHE.get(key);
  return hit === undefined ? null : touch(key, hit);
}

/**
 * Synchronous probe kept for callers: returns cached HTML or null. It never
 * tokenizes on the main thread any more (that is what could freeze the page);
 * a null means "use the async path".
 */
export function highlightSync(
  code: string,
  lang: string,
  isDark: boolean,
): string | null {
  return getCachedHighlight(code, lang, isDark);
}

/**
 * Highlight in a worker under a deadline. Always resolves: coloured HTML, or
 * `plainHtml(code)` if the block was too slow or highlighting is unavailable.
 */
export async function highlight(
  code: string,
  lang: string,
  isDark: boolean,
): Promise<string> {
  const key = cacheKey(code, lang, isDark);
  const cached = HL_CACHE.get(key);
  if (cached !== undefined) return touch(key, cached);

  const html = await getPool().highlight(
    code,
    (lang || PLAINTEXT).toLowerCase(),
    isDark ? THEME_DARK : THEME_LIGHT,
  );
  return store(key, html ?? plainHtml(code));
}
