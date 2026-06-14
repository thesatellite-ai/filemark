import { useCallback, useEffect, useMemo, useState } from "react";
import { getExample } from "./examples";
import { RenderedDoc } from "./RenderedDoc";
import { MonacoPane } from "./MonacoPane";

const DEFAULT_ID = "playground-starter";
const URL_PARAM = "src";
const URL_PARAM_GZ = "srcz";

export function Playground() {
  const [source, setSource] = useState<string>(() => readInitial());
  const [copied, setCopied] = useState(false);
  // On small screens we show one pane at a time (toggle). On md+ both panes
  // are visible side-by-side and this state is ignored.
  const [mobilePane, setMobilePane] = useState<"source" | "preview">(
    "preview",
  );

  // Gzip URL-param decode runs once on mount (DecompressionStream is async).
  // Overrides the initial source when ?srcz= is present, then strips the
  // param so subsequent edits (which write `?src=`) take precedence on
  // reload — otherwise srcz would win forever and the editor's changes
  // would silently revert.
  useEffect(() => {
    let cancelled = false;
    decodeGzipParam().then((text) => {
      if (cancelled) return;
      if (text != null) {
        setSource(text);
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete(URL_PARAM_GZ);
          history.replaceState(null, "", url.toString());
        } catch {
          /* URL mutation is best-effort */
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-[12px]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold">Playground</span>
          <span className="text-muted-foreground hidden sm:inline">
            edit the markdown on the left · live preview on the right
          </span>
          {/* Mobile-only Source/Preview toggle */}
          <div className="md:hidden inline-flex rounded-md border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setMobilePane("source")}
              className={mobileTab(mobilePane === "source")}
            >
              Source
            </button>
            <button
              type="button"
              onClick={() => setMobilePane("preview")}
              className={mobileTab(mobilePane === "preview")}
            >
              Preview
            </button>
          </div>
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
        <div
          className={[
            "h-full min-h-0 bg-background",
            // On <md, only show one pane at a time. md+ shows both.
            mobilePane === "source" ? "block" : "hidden",
            "md:block",
          ].join(" ")}
        >
          <MonacoPane
            value={source}
            onChange={setSource}
            language="markdown"
          />
        </div>
        <div
          className={[
            "h-full min-h-0 overflow-auto bg-background",
            mobilePane === "preview" ? "block" : "hidden",
            "md:block",
          ].join(" ")}
        >
          <RenderedDoc content={source} fileId="playground" name="playground.md" />
        </div>
      </div>
    </div>
  );
}

function mobileTab(active: boolean): string {
  return [
    "rounded px-2.5 py-0.5 text-[11px] font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:text-foreground",
  ].join(" ");
}

function readInitial(): string {
  if (typeof window === "undefined") {
    return getExample(DEFAULT_ID)?.content ?? "";
  }
  const params = new URL(window.location.href).searchParams;

  // Gzipped variant — preferred when present (handles much larger docs).
  // The compressed bytes arrive as URL-safe base64; we decode + inflate
  // synchronously-ish via DecompressionStream in a microtask. We can't
  // make readInitial async without restructuring useState init, so the
  // gzip path schedules a setSource() through the parent. Instead we
  // do a sync/blocking decode using DecompressionStream + Response —
  // the extracted promise resolves in the same render frame for typical
  // docs, but to keep readInitial sync we fall back to a separate effect.
  // See decodeGzipParam called from useEffect below for the real wiring.

  const encoded = params.get(URL_PARAM);
  if (encoded) {
    try {
      return decodeURIComponent(atob(encoded));
    } catch {
      /* bad encoding — fall through */
    }
  }
  return getExample(DEFAULT_ID)?.content ?? "";
}

/** Decode a `?srcz=<base64-gzip>` payload back to text. Async — gzip can't
 *  be inflated synchronously. Returns null when no param OR decode fails. */
async function decodeGzipParam(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const params = new URL(window.location.href).searchParams;
  const encoded = params.get(URL_PARAM_GZ);
  if (!encoded) return null;
  try {
    const binStr = atob(encoded);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    const stream = new Response(bytes).body!.pipeThrough(
      new DecompressionStream("gzip"),
    );
    return await new Response(stream).text();
  } catch {
    return null;
  }
}
