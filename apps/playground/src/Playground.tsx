import { useCallback, useEffect, useMemo, useState } from "react";
import { getExample } from "./examples";
import { RenderedDoc } from "./RenderedDoc";
import { MonacoPane } from "./MonacoPane";

const DEFAULT_ID = "playground-starter";
const URL_PARAM = "src";

export function Playground() {
  const [source, setSource] = useState<string>(() => readInitial());
  const [copied, setCopied] = useState(false);

  // Debounced URL sync — updates `?src=<base64>` without spamming history.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const encoded = btoa(encodeURIComponent(source));
        const url = new URL(window.location.href);
        url.searchParams.set(URL_PARAM, encoded);
        history.replaceState(null, "", url.toString());
      } catch {
        /* encoding failed — ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [source]);

  const shareUrl = useMemo(() => {
    try {
      const encoded = btoa(encodeURIComponent(source));
      const url = new URL(window.location.href);
      url.searchParams.set(URL_PARAM, encoded);
      return url.toString();
    } catch {
      return window.location.href;
    }
  }, [source]);

  const onShare = useCallback(() => {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [shareUrl]);

  const onReset = useCallback(() => {
    setSource(getExample(DEFAULT_ID)?.content ?? "");
    const url = new URL(window.location.href);
    url.searchParams.delete(URL_PARAM);
    history.replaceState(null, "", url.toString());
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5 text-[12px]">
        <div className="flex items-center gap-3">
          <span className="font-semibold">Playground</span>
          <span className="text-muted-foreground">
            edit the markdown on the left · live preview on the right
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReset}
            className="h-7 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            title="Reset to the starter document"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onShare}
            className="h-7 rounded-md bg-primary px-2.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            title="Copy a share URL that encodes the current source"
          >
            {copied ? "Copied ✓" : "Copy share URL"}
          </button>
        </div>
      </div>
      <div className="grid flex-1 min-h-0 gap-px bg-border md:grid-cols-2">
        <div className="h-full min-h-0 bg-background">
          <MonacoPane
            value={source}
            onChange={setSource}
            language="markdown"
          />
        </div>
        <div className="h-full min-h-0 overflow-auto bg-background">
          <RenderedDoc content={source} fileId="playground" name="playground.md" />
        </div>
      </div>
    </div>
  );
}

function readInitial(): string {
  if (typeof window === "undefined") {
    return getExample(DEFAULT_ID)?.content ?? "";
  }
  const encoded = new URL(window.location.href).searchParams.get(URL_PARAM);
  if (encoded) {
    try {
      return decodeURIComponent(atob(encoded));
    } catch {
      /* bad encoding — fall through */
    }
  }
  return getExample(DEFAULT_ID)?.content ?? "";
}
