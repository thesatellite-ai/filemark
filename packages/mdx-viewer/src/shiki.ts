/**
 * Hand-rolled Shiki setup using the core API so Vite/Rollup only bundles
 * the languages + themes we care about (the top-level `shiki` entry ships
 * dynamic imports that Rollup statically resolves → ~200 langs in the bundle).
 *
 * We use the JavaScript regex engine instead of the WASM Oniguruma engine to
 * keep the bundle small AND to avoid needing `wasm-unsafe-eval` in the MV3
 * extension CSP. The JS engine translates Oniguruma patterns to native
 * `RegExp` — and some translations could catastrophically BACKTRACK.
 *
 * ⚠️ shiki MUST stay >= 4.3.0 — DO NOT DOWNGRADE. shiki <= 2.5's JS engine
 * backtracked *infinitely* on ordinary Go code (struct-tag raw strings +
 * aligned trailing comments, e.g. `type AnyNode struct { Base }   // …`).
 * Because `codeToHtml` runs SYNCHRONOUSLY (see `highlight()` below — only the
 * lang/engine *loading* is async; the tokenize itself is blocking), one such
 * block locked the whole renderer: the doc painted up to that block, then the
 * tab froze hard and became unclickable. 4.x fixed the backtracking. The
 * `try/catch` around `codeToHtml` only saves us from grammars that THROW — it
 * cannot rescue a backtracking hang, so the engine/version is the real guard.
 * Full write-up: docsi/INCIDENTS.md (sev2, 2026-06-29).
 */

import type { HighlighterCore } from "shiki/core";

let highlighterPromise: Promise<HighlighterCore> | null = null;
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
      return createHighlighterCore({
        themes: [light.default, dark.default],
        langs: [],
        engine: createJavaScriptRegexEngine(),
      });
    })();
  }
  return highlighterPromise;
}

async function ensureLang(lang: string): Promise<string> {
  const hl = await getHighlighter();
  const normalized = lang.toLowerCase();
  if (loaded.has(normalized)) return normalized;
  const loader = LANGS[normalized];
  if (!loader) return "text";
  try {
    const mod = await loader();
    await hl.loadLanguage(mod.default as Parameters<HighlighterCore["loadLanguage"]>[0]);
    loaded.add(normalized);
    // Some lang files register multiple grammar names — trust normalized.
    return normalized;
  } catch {
    return "text";
  }
}

// LRU cache of highlighted HTML keyed by `<lang>:<theme>:<codeHash>`.
// Bounded so giant docs with hundreds of fences don't balloon memory.
// Re-rendering the same code block (e.g. on tab switch back to a doc
// already viewed) hits this cache → no shiki call, no async tick.
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

export function getCachedHighlight(
  code: string,
  lang: string,
  isDark: boolean,
): string | null {
  const key = `${lang || "text"}:${isDark ? "d" : "l"}:${fnv1a(code)}`;
  const hit = HL_CACHE.get(key);
  if (hit === undefined) return null;
  // LRU touch — re-insert moves to most-recent position in iteration order.
  HL_CACHE.delete(key);
  HL_CACHE.set(key, hit);
  return hit;
}

export async function highlight(
  code: string,
  lang: string,
  isDark: boolean
): Promise<string> {
  const key = `${lang || "text"}:${isDark ? "d" : "l"}:${fnv1a(code)}`;
  const cached = HL_CACHE.get(key);
  if (cached !== undefined) {
    HL_CACHE.delete(key);
    HL_CACHE.set(key, cached);
    return cached;
  }

  const hl = await getHighlighter();
  const resolved = await ensureLang(lang || "text");
  let html: string;
  try {
    // SYNCHRONOUS + main-thread: tokenizing happens here, not in the awaits
    // above. A grammar that backtracks badly would hang the whole tab (see the
    // module header — that's why shiki is version-floored at >= 4.3.0). The
    // catch only handles grammars that *throw*.
    html = hl.codeToHtml(code, {
      lang: resolved,
      theme: isDark ? "github-dark" : "github-light",
    });
  } catch {
    html = hl.codeToHtml(code, {
      lang: "text",
      theme: isDark ? "github-dark" : "github-light",
    });
  }
  HL_CACHE.set(key, html);
  if (HL_CACHE.size > HL_CACHE_MAX) {
    // Drop oldest (first inserted) — Map iteration order is insertion.
    const oldest = HL_CACHE.keys().next().value;
    if (oldest !== undefined) HL_CACHE.delete(oldest);
  }
  return html;
}
