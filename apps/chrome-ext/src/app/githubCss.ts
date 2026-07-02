// On-demand loader for the GitHub-preview stylesheet.
//
// Why this exists: `@filemark/mdx/github.css` is ~220KB — github-markdown-css
// plus the base64-embedded Mona Sans font (~183KB of it). GitHub preview is an
// opt-in mode most sessions never touch, so statically importing it made every
// app page and every file:// injection pay ~220KB for nothing. This loads it
// lazily the first time GitHub mode is actually shown, and never otherwise.
//
// Works in BOTH the app page and the injected file:// viewer: it dynamic-imports
// the CSS as a `?inline` string (a lazy JS chunk in each build) and injects it
// via a <style> tag — the same manual-injection approach the content script uses
// for its base CSS, which sidesteps page-CSP issues with <link> on sandboxed
// pages.

// Single <style> id so the inject is idempotent + findable for a fast ready check.
const GITHUB_STYLE_ID = "fv-github-css";

// Memoized so concurrent callers share one network/parse pass.
let injectPromise: Promise<void> | null = null;

/** True once the GitHub stylesheet has been injected into this document. */
export function isGithubCssReady(): boolean {
  return (
    typeof document !== "undefined" &&
    document.getElementById(GITHUB_STYLE_ID) !== null
  );
}

/**
 * Ensure the GitHub-preview stylesheet is present in the document, loading it on
 * first call. Idempotent and safe to call repeatedly. Resolves once the <style>
 * is in the DOM (so callers can gate first paint on it to avoid an unstyled
 * flash).
 */
export function ensureGithubCss(): Promise<void> {
  if (isGithubCssReady()) return Promise.resolve();
  return (injectPromise ??= import("@filemark/mdx/github.css?inline").then(
    (mod) => {
      // Re-check: another call (or a prior mount) may have injected it while
      // this chunk was loading.
      if (isGithubCssReady()) return;
      const style = document.createElement("style");
      style.id = GITHUB_STYLE_ID;
      style.textContent = mod.default;
      document.head.appendChild(style);
    },
  ));
}
