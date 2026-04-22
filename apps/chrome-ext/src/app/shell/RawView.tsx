import { useEffect, useState } from "react";
import { highlightCode } from "@filemark/mdx";
import { useLibrary } from "../store";
import { Copy, WrapText } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Raw file view — shows the source exactly as it sits on disk, highlighted
 * with Shiki using the same grammar pipeline the MDX code blocks use. Read
 * only for v0.1; Monaco-editable mode is a v0.2 candidate.
 *
 * Wrap toggle: files with long lines overflow their container by default.
 * The toolbar exposes a "Wrap" toggle so the user can pick horizontal
 * scroll vs. soft-wrapped lines. Preference isn't persisted — session only.
 */
export function RawView({
  content,
  ext,
}: {
  content: string;
  ext: string;
}) {
  const theme = useLibrary((s) => s.theme);
  const isDark = theme.mode === "dark";
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);

  useEffect(() => {
    let cancelled = false;
    highlightCode(content.trimEnd(), extToLang(ext), isDark)
      .then((h) => !cancelled && setHtml(h))
      .catch(() => !cancelled && setHtml(null));
    return () => {
      cancelled = true;
    };
  }, [content, ext, isDark]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  // The shiki HTML is always a `<pre>` with an inline bg color. We strip
  // margins, neutralize the inline bg, apply our own padding / size, and
  // either force horizontal scroll or soft-wrap depending on the toggle.
  const shikiClasses = wrap
    ? "[&_pre]:m-0 [&_pre]:!bg-transparent [&_pre]:p-4 [&_pre]:text-[13px] [&_pre]:leading-relaxed [&_pre]:whitespace-pre-wrap [&_pre]:break-words"
    : "[&_pre]:m-0 [&_pre]:!bg-transparent [&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:text-[13px] [&_pre]:leading-relaxed";

  const plainClasses = wrap
    ? "m-0 whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-relaxed"
    : "m-0 overflow-x-auto whitespace-pre p-4 font-mono text-[13px] leading-relaxed";

  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-md border">
      <div className="bg-muted sticky top-0 z-10 flex items-center justify-between gap-2 border-b px-4 py-1.5">
        <div className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
          Raw · {ext}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={
              "h-6 gap-1.5 px-2 text-[11px] " +
              (wrap ? "text-primary" : "text-muted-foreground")
            }
            onClick={() => setWrap((w) => !w)}
            title={wrap ? "Stop wrapping long lines" : "Wrap long lines"}
            aria-pressed={wrap}
          >
            <WrapText className="size-3" />
            {wrap ? "Wrap on" : "Wrap off"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1.5 px-2 text-[11px]"
            onClick={copy}
          >
            <Copy className="size-3" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      {html ? (
        <div className={shikiClasses} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className={plainClasses}>{content}</pre>
      )}
    </div>
  );
}

function extToLang(ext: string): string {
  const m: Record<string, string> = {
    md: "markdown",
    mdx: "markdown",
    markdown: "markdown",
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    json: "json",
    jsonc: "jsonc",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    sh: "bash",
    bash: "bash",
  };
  return m[ext.toLowerCase()] ?? "text";
}
