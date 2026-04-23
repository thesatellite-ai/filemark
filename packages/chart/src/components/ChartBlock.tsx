import { useEffect, useState } from "react";
import type { AssetResolver } from "@filemark/core";
import type { ChartOptions } from "../types";
import { ChartFromText } from "./ChartFromText";

export interface ChartBlockProps {
  /** Inline CSV/TSV text — ignored when `options.src` is set. */
  source: string;
  options: ChartOptions;
  /** Default delimiter when not set in options. */
  defaultDelimiter?: string;
  assets?: AssetResolver;
}

type FetchState =
  | { kind: "ready"; text: string }
  | { kind: "loading" }
  | { kind: "error"; message: string };

/**
 * Handles the same external-data flow as the datagrid's `DataBlock`:
 * absolute URLs fetched directly (host_permissions in the extension
 * bypass CORS); relative paths go through the injected AssetResolver;
 * on miss / CORS fail / network error → inline error card, never an
 * empty chart.
 */
export function ChartBlock({
  source,
  options,
  defaultDelimiter,
  assets,
}: ChartBlockProps) {
  const src = options.src;
  const [state, setState] = useState<FetchState>(() =>
    src
      ? { kind: "loading" }
      : { kind: "ready", text: source.replace(/\n$/, "") },
  );

  useEffect(() => {
    if (!src) {
      setState({ kind: "ready", text: source.replace(/\n$/, "") });
      return;
    }
    setState({ kind: "loading" });
    let cancelled = false;
    (async () => {
      try {
        const url = isAbsoluteUrl(src)
          ? src
          : await resolveRelative(src, assets);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
        const text = await res.text();
        if (!cancelled) setState({ kind: "ready", text });
      } catch (e) {
        if (!cancelled) {
          setState({ kind: "error", message: explainError(e, src) });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src, assets, source]);

  if (state.kind === "loading") {
    return (
      <div className="not-prose my-4 rounded-md border border-border/60 bg-card px-3 py-2 text-xs italic text-muted-foreground">
        loading {src}…
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="not-prose my-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
        <div className="font-semibold text-amber-600 dark:text-amber-400">
          Chart — can&apos;t load {src ?? "data"}
        </div>
        <div className="mt-1 text-foreground/80">{state.message}</div>
      </div>
    );
  }

  return (
    <ChartFromText
      text={state.text}
      options={options}
      defaultDelimiter={defaultDelimiter}
    />
  );
}

function isAbsoluteUrl(s: string): boolean {
  return /^(https?|file|blob|data):/i.test(s);
}

async function resolveRelative(
  src: string,
  assets: AssetResolver | undefined,
): Promise<string> {
  if (!assets) {
    throw new Error(
      "relative paths require a folder-opened context. Open via a folder picker, use an absolute https:// URL, or inline the data.",
    );
  }
  const url = await assets.resolve(src);
  if (!url) throw new Error(`path not found: ${src}`);
  return url;
}

function explainError(e: unknown, src: string): string {
  if (e instanceof Error) {
    if (e.name === "TypeError" && /fetch/i.test(e.message)) {
      return `couldn't fetch ${src} — check the URL, target server, and network. DevTools → Network shows the exact reason.`;
    }
    return e.message;
  }
  return String(e);
}
