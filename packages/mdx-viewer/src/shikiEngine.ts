/**
 * The Shiki highlighter itself: engine + themes + grammar registry. Runs ONLY
 * inside the highlight Web Worker (shiki.worker.ts) — never on the page's main
 * thread — because tokenizing is synchronous and some grammar regexes backtrack
 * exponentially on ordinary input (see the Go incident in shiki.ts). A worker
 * stuck inside one regex exec can be terminated; the main thread cannot.
 *
 * Engine: the JavaScript regex engine (not WASM Oniguruma) — keeps us off
 * `wasm-unsafe-eval` in the MV3 extension CSP.
 *
 * ⚠️ shiki MUST stay >= 4.3.0 — DO NOT DOWNGRADE. shiki <= 2.5's JS engine
 * backtracked infinitely on far more common Go code. The worker deadline is the
 * real guard now, but an older engine would turn many more blocks plain.
 */

import type { HighlighterCore } from "shiki/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import githubLight from "shiki/themes/github-light.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import type { ShikiTheme } from "./shikiProtocol";

type LangLoader = () => Promise<{ default: unknown }>;

/** Fence-language alias → grammar loader. Unknown languages render as `text`. */
export const LANGS: Record<string, LangLoader> = {
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

export const PLAINTEXT = "text";

let highlighterPromise: Promise<HighlighterCore> | null = null;
const loaded = new Set<string>();

function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [githubLight, githubDark],
    langs: [],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighterPromise;
}

/** Load `lang`'s grammar if we know it; resolve to the name to tokenize with. */
export async function ensureLang(lang: string): Promise<string> {
  const hl = await getHighlighter();
  const normalized = (lang || PLAINTEXT).toLowerCase();
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
 * Load everything a block needs, then hand back a SYNCHRONOUS tokenize thunk.
 * Split in two so the worker can announce "start" between the async load and
 * the (possibly unbounded) sync tokenize.
 */
export async function prepare(
  lang: string,
  theme: ShikiTheme,
): Promise<(code: string) => string> {
  const hl = await getHighlighter();
  const resolved = await ensureLang(lang);
  return (code) => {
    try {
      return hl.codeToHtml(code, { lang: resolved, theme });
    } catch {
      return hl.codeToHtml(code, { lang: PLAINTEXT, theme });
    }
  };
}
