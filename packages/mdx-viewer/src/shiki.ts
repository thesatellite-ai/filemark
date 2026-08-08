/**
 * Lazy Shiki setup using the core API so Vite/Rollup only bundles the languages
 * + themes we care about, EACH AS ITS OWN dynamic-import chunk. This keeps the
 * viewer's initial chunk small (fast first paint, no big "Loading…" gate) — the
 * synchronous alternative (statically bundling the engine + all grammars) pulled
 * ~2.4 MB into the main chunk and produced a visible full-page loader on every
 * reload, which is worse than a brief highlight delay.
 *
 * To avoid the "uncoloured → coloured" flash despite loading lazily we combine:
 *   • warm(langs)     — kick the engine + a document's grammars loading on mount,
 *   • highlightSync()  — once warm, colour a block on its FIRST render (no swap),
 *   • highlight()      — async fallback for the brief cold window before warm.
 *
 * Engine: the JavaScript regex engine (not WASM Oniguruma) — keeps us off
 * `wasm-unsafe-eval` in the MV3 extension CSP. It translates Oniguruma patterns
 * to native `RegExp`, which can catastrophically BACKTRACK on some grammars.
 *
 * ⚠️ shiki MUST stay >= 4.3.0 — DO NOT DOWNGRADE. shiki <= 2.5's JS engine
 * backtracked *infinitely* on ordinary Go code (struct-tag raw strings + aligned
 * trailing comments, e.g. `type AnyNode struct { Base }   // …`). `codeToHtml`
 * tokenizes SYNCHRONOUSLY (only the lang/engine *loading* is async), so one such
 * block froze the whole tab. 4.x fixed the backtracking; the `try/catch` around
 * `codeToHtml` only rescues grammars that THROW, not a backtracking hang — the
 * engine/version is the real guard. Full write-up: docsi/INCIDENTS.md (2026-06-29).
 */

import type { HighlighterCore } from "shiki/core";

let highlighterPromise: Promise<HighlighterCore> | null = null;
// The resolved highlighter, captured once the promise settles, so `highlightSync`
// can tokenize on the main thread WITHOUT awaiting — the sync path is what colours
// a block on its very first paint once the engine + its grammar are already warm.
let highlighterInstance: HighlighterCore | null = null;
const loaded = new Set<string>();

type LangLoader = () => Promise<{ default: unknown }>;

const LANGS: Record<string, LangLoader> = {
  typescript: () => import("shiki/langs/typescript.mjs"),
  ts: () => import("shiki/langs/typescript.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  js: () => import("shiki/langs/javascript.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  jsonc: () => import("shiki/langs/jsonc.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  scss: () => import("shiki/langs/scss.mjs"),
  bash: () => import("shiki/langs/bash.mjs"),
  shell: () => import("shiki/langs/shellscript.mjs"),
  sh: () => import("shiki/langs/shellscript.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
  yml: () => import("shiki/langs/yaml.mjs"),
  toml: () => import("shiki/langs/toml.mjs"),
  markdown: () => import("shiki/langs/markdown.mjs"),
  md: () => import("shiki/langs/markdown.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  py: () => import("shiki/langs/python.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  rs: () => import("shiki/langs/rust.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  diff: () => import("shiki/langs/diff.mjs"),
  java: () => import("shiki/langs/java.mjs"),
  c: () => import("shiki/langs/c.mjs"),
  cpp: () => import("shiki/langs/cpp.mjs"),
  php: () => import("shiki/langs/php.mjs"),
  ruby: () => import("shiki/langs/ruby.mjs"),
  rb: () => import("shiki/langs/ruby.mjs"),
  swift: () => import("shiki/langs/swift.mjs"),
  kotlin: () => import("shiki/langs/kotlin.mjs"),
};

const THEME_DARK = "github-dark";
const THEME_LIGHT = "github-light";
const PLAINTEXT = "text";

async function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] =
        await Promise.all([
          import("shiki/core"),
          import("shiki/engine/javascript"),
        ]);
      const [light, dark] = await Promise.all([
        import("shiki/themes/github-light.mjs"),
        import("shiki/themes/github-dark.mjs"),
      ]);
      const core = await createHighlighterCore({
        themes: [light.default, dark.default],
        langs: [],
        engine: createJavaScriptRegexEngine(),
      });
      highlighterInstance = core;
      return core;
    })();
  }
  return highlighterPromise;
}

async function ensureLang(lang: string): Promise<string> {
  const hl = await getHighlighter();
  const normalized = lang.toLowerCase();
  if (loaded.has(normalized)) return normalized;
  const loader = LANGS[normalized];
  if (!loader) return PLAINTEXT;
  try {
    const mod = await loader();
    await hl.loadLanguage(
      mod.default as Parameters<HighlighterCore["loadLanguage"]>[0],
    );
    loaded.add(normalized);
    return normalized;
  } catch {
    return PLAINTEXT;
  }
}

/**
 * Pre-load the engine + the given languages WITHOUT tokenizing, so by the time
 * (or shortly after) a document's code blocks render, `highlightSync` can colour
 * them on first paint instead of flashing the plain fallback. Fire-and-forget;
 * failures fall back to the async `highlight()` path.
 */
export async function warm(langs: Iterable<string>): Promise<void> {
  await getHighlighter();
  const unique = [
    ...new Set([...langs].map((l) => (l || PLAINTEXT).toLowerCase())),
  ];
  await Promise.all(unique.map((l) => ensureLang(l)));
}

// LRU cache of highlighted HTML keyed by `<lang>:<theme>:<codeHash>`. Bounded so
// giant docs with hundreds of fences don't balloon memory. Re-highlighting the
// same block (theme unchanged, re-render, tab switch back) hits this cache.
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

/**
 * Return already-highlighted HTML for this exact (code, lang, theme) if cached,
 * else null. Pure cache read — cheapest first-render probe.
 */
export function getCachedHighlight(
  code: string,
  lang: string,
  isDark: boolean,
): string | null {
  const hit = HL_CACHE.get(cacheKey(code, lang, isDark));
  return hit === undefined ? null : touch(cacheKey(code, lang, isDark), hit);
}

/**
 * Synchronous highlight — returns HTML immediately IF the engine and this
 * language's grammar are already loaded (e.g. after `warm()`); otherwise null.
 *
 * Used to seed a block's first render so it paints already coloured. Returning
 * null (never throwing, never blocking on a load) is the contract — a null means
 * "not warm yet, use the async path". A known-but-unloaded grammar returns null
 * so we don't render it as unstyled `text` then re-render; an unknown language
 * resolves to `text` (needs no grammar) and highlights synchronously.
 */
export function highlightSync(
  code: string,
  lang: string,
  isDark: boolean,
): string | null {
  if (!highlighterInstance) return null;
  const normalized = (lang || PLAINTEXT).toLowerCase();
  if (normalized !== PLAINTEXT && LANGS[normalized] && !loaded.has(normalized)) {
    return null;
  }
  const key = cacheKey(code, lang, isDark);
  const cached = HL_CACHE.get(key);
  if (cached !== undefined) return touch(key, cached);

  const resolved = loaded.has(normalized) ? normalized : PLAINTEXT;
  try {
    return store(
      key,
      highlighterInstance.codeToHtml(code, {
        lang: resolved,
        theme: isDark ? THEME_DARK : THEME_LIGHT,
      }),
    );
  } catch {
    return null;
  }
}

/**
 * Async highlight — the cold-path fallback. Loads the engine + grammar if needed,
 * then tokenizes. Result is cached so later renders (and highlightSync) hit it.
 */
export async function highlight(
  code: string,
  lang: string,
  isDark: boolean,
): Promise<string> {
  const key = cacheKey(code, lang, isDark);
  const cached = HL_CACHE.get(key);
  if (cached !== undefined) return touch(key, cached);

  const hl = await getHighlighter();
  const resolved = await ensureLang(lang || PLAINTEXT);
  const theme = isDark ? THEME_DARK : THEME_LIGHT;
  let html: string;
  try {
    html = hl.codeToHtml(code, { lang: resolved, theme });
  } catch {
    html = hl.codeToHtml(code, { lang: PLAINTEXT, theme });
  }
  return store(key, html);
}
