import { useEffect, useState } from "react";
import { highlight, getCachedHighlight } from "./shiki";
import { useTheme } from "@filemark/core";

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
    <div className="fv-code-block" data-lang={lang || "text"}>
      <div className="fv-code-toolbar">
        {lang && <span className="fv-code-lang">{lang}</span>}
        <button
          type="button"
          className="fv-code-copy"
          onClick={copy}
          aria-label="Copy code"
        >
          Copy
        </button>
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
