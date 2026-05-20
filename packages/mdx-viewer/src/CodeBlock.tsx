import { useEffect, useState } from "react";
import { highlight, getCachedHighlight } from "./shiki";
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
  // Synchronous cache hit on first render → no plain-text flash on the
  // tab-switch-back path. Uncached → still falls through to the async
  // useEffect below.
  const [html, setHtml] = useState<string | null>(() =>
    inline || !trimmed.trim()
      ? null
      : getCachedHighlight(trimmed, lang, isDark),
  );

  useEffect(() => {
    if (inline || !trimmed.trim()) return;
    // If we hydrated synchronously from cache for the same inputs, skip
    // the async pass.
    const cached = getCachedHighlight(trimmed, lang, isDark);
    if (cached !== null) {
      if (cached !== html) setHtml(cached);
      return;
    }
    let cancelled = false;
    highlight(trimmed, lang, isDark)
      .then((h) => !cancelled && setHtml(h))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <pre className="fv-code-plain">
          <code className={className}>{raw}</code>
        </pre>
      )}
    </div>
  );
}
