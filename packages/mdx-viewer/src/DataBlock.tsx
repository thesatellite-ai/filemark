import { useEffect, useState } from "react";
import type { AssetResolver, StorageAdapter } from "@filemark/core";
import {
  DataGridFromText,
  type DataGridOptions,
} from "@filemark/datagrid";

export interface DataBlockProps {
  /** Inline CSV/TSV text. Ignored when `options.src` is set. */
  source: string;
  /** Pre-parsed options (already includes src, type specs, etc.). */
  options: DataGridOptions;
  lang: "csv" | "tsv" | "datagrid";
  assets?: AssetResolver;
  storage?: StorageAdapter;
  storageKey?: string;
  /** Author-written info-string that produced `options` — preserved so
   *  the datagrid's Raw toggle can show exactly what the user wrote. */
  meta?: string;
}

type FetchState =
  | { kind: "ready"; text: string }
  | { kind: "loading" }
  | { kind: "error"; message: string };

export function DataBlock({
  source,
  options,
  lang,
  assets,
  storage,
  storageKey,
  meta,
}: DataBlockProps) {
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
      <div className="not-prose my-4 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground italic">
        loading {src}…
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="not-prose my-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
        <div className="font-semibold text-amber-600 dark:text-amber-400">
          Datagrid — can&apos;t load {src ?? "data"}
        </div>
        <div className="mt-1 text-foreground/80">{state.message}</div>
      </div>
    );
  }

  return (
    <DataGridFromText
      text={state.text}
      options={options}
      defaultDelimiter={lang === "tsv" ? "\t" : ","}
      storage={storage}
      storageKey={storageKey}
      rawLang={lang}
      rawMeta={meta}
      rawSource={source.replace(/\n$/, "")}
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
    // TypeError "Failed to fetch" is the idiomatic browser response for
    // DNS, network, and (rarely here — the manifest declares
    // host_permissions: ["<all_urls>"]) CORS failures.
    if (e.name === "TypeError" && /fetch/i.test(e.message)) {
      return `couldn't fetch ${src} — check the URL, the target server, and your network. DevTools → Network tab will show the exact reason.`;
    }
    return e.message;
  }
  return String(e);
}
