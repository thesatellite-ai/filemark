import { useEffect, useState } from "react";
import { highlight, getCachedHighlight, highlightSync } from "./shiki";
import { useTheme } from "@filemark/core";

const IconCopy = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconWrap = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M3 12h15a3 3 0 0 1 0 6h-4" />
    <polyline points="16 14 14 18 16 22" />
    <line x1="3" y1="18" x2="10" y2="18" />
  </svg>
);
const IconNoWrap = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export function CodeBlock({
  inline,
  className,
  children,
  ...rest
}: {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const raw = String(children ?? "");
  const lang = /language-(\w+)/.exec(className ?? "")?.[1] ?? "";
  const trimmed = raw.replace(/\n$/, "");
  const [wrap, setWrap] = useState(true);
  // Seed the first render synchronously so the block paints ALREADY highlighted
  // whenever possible — cheapest-first: the LRU cache (re-render / tab-switch),
  // then highlightSync (engine + grammar already warm, e.g. after MDXViewer's
  // warm() preloaded this doc's languages). Both return null on a genuinely cold
  // block → we render the readable plain fallback and the async effect below
  // fills in colours a moment later. Shiki is lazy-loaded to keep the initial
  // chunk small (no full-page loader), so this warm-vs-cold split is what keeps
  // the cold flash rare and brief instead of gating the whole page.
  const [html, setHtml] = useState<string | null>(() =>
    inline || !trimmed.trim()
      ? null
      : getCachedHighlight(trimmed, lang, isDark) ??
        highlightSync(trimmed, lang, isDark),
  );

  // Re-highlight when the code, language, or theme changes (the useState seed
  // above only runs on mount). Try the sync path first — after warm, a theme
  // toggle recolours instantly with no flash; only a genuinely cold block falls
  // through to the async load, showing the readable plain fallback meanwhile.
  useEffect(() => {
    if (inline || !trimmed.trim()) return;
    const sync =
      getCachedHighlight(trimmed, lang, isDark) ??
      highlightSync(trimmed, lang, isDark);
    if (sync !== null) {
      setHtml(sync);
      return;
    }
    setHtml(null);
    let cancelled = false;
    highlight(trimmed, lang, isDark)
      .then((h) => !cancelled && setHtml(h))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [trimmed, lang, isDark, inline]);

  if (inline) {
    return (
      <code className={`fv-code-inline ${className ?? ""}`} {...rest}>
        {children}
      </code>
    );
  }

  const copy = () => {
    navigator.clipboard?.writeText(raw).catch(() => {});
  };

  return (
    <div className="fv-code-block" data-lang={lang || "text"} data-wrap={wrap ? "on" : "off"}>
      <div className="fv-code-toolbar">
        {lang && <span className="fv-code-lang">{lang}</span>}
        <div className="fv-code-actions">
          <button
            type="button"
            className="fv-code-iconbtn"
            onClick={() => setWrap((w) => !w)}
            aria-label={wrap ? "Disable line wrap" : "Enable line wrap"}
            aria-pressed={!wrap}
            title={wrap ? "Wrap: on (click to scroll)" : "Wrap: off (click to wrap)"}
          >
            {wrap ? <IconWrap /> : <IconNoWrap />}
          </button>
          <button
            type="button"
            className="fv-code-iconbtn"
            onClick={copy}
            aria-label="Copy code"
            title="Copy"
          >
            <IconCopy />
          </button>
        </div>
      </div>
      {html ? (
        <div className="fv-code-shiki" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        // Only reached if the synchronous highlighter failed to build (see
        // shiki.ts getHighlighter) — render the raw code plainly so it's always
        // readable. Not a transient loading state: highlightSync is synchronous.
        <pre className="fv-code-plain">
          <code className={className}>{raw}</code>
        </pre>
      )}
    </div>
  );
}
