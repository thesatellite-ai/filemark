/**
 * Hand-rolled Shiki setup using the core API so Vite/Rollup only bundles
 * the languages + themes we care about (the top-level `shiki` entry ships
 * dynamic imports that Rollup statically resolves → ~200 langs in the bundle).
 *
 * We use the JavaScript regex engine instead of the WASM Oniguruma engine
 * to keep the bundle below ~100 KB. Tradeoff: slightly slower and a tiny
 * handful of complex grammars aren't fully supported — none of them are in
 * our supported-language set.
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

export async function highlight(
  code: string,
  lang: string,
  isDark: boolean
): Promise<string> {
  const hl = await getHighlighter();
  const resolved = await ensureLang(lang || "text");
  try {
    return hl.codeToHtml(code, {
      lang: resolved,
      theme: isDark ? "github-dark" : "github-light",
    });
  } catch {
    return hl.codeToHtml(code, {
      lang: "text",
      theme: isDark ? "github-dark" : "github-light",
    });
  }
}
