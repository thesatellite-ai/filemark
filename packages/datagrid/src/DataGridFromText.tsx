import { useMemo } from "react";
import type { StorageAdapter } from "@filemark/core";
import { DataGrid } from "./DataGrid";
import { parseCSV } from "./parseCSV";
import { parseInfoString } from "./parseInfoString";
import type { DataGridOptions } from "./types";

export interface DataGridFromTextProps {
  /** Raw csv/tsv text. Ignored if empty + `options.src` was fetched upstream. */
  text: string;
  /** Info-string flags after the lang tag (e.g. `"filter=false sort=age:desc"`). */
  meta?: string;
  /** Pre-parsed options override. Merged over `meta`. */
  options?: DataGridOptions;
  /** Default delimiter when not set in `meta`. Use `"\t"` for tsv. */
  defaultDelimiter?: string;
  storage?: StorageAdapter;
  storageKey?: string;
  /** Original fence lang, passed to the Raw view. */
  rawLang?: string;
  /** Original fence info-string, passed to the Raw view. */
  rawMeta?: string;
  /** Original fence body (or empty for `src=`-based tags). Passed to the
   *  Raw view so users can see exactly what the author wrote. */
  rawSource?: string;
}

export function DataGridFromText({
  text,
  meta,
  options: override,
  defaultDelimiter,
  storage,
  storageKey,
  rawLang,
  rawMeta,
  rawSource,
}: DataGridFromTextProps) {
  const merged: DataGridOptions = useMemo(() => {
    const parsed = parseInfoString(meta);
    return { ...parsed, ...override };
  }, [meta, override]);

  const table = useMemo(
    () =>
      parseCSV({
        text,
        delimiter: merged.delimiter ?? defaultDelimiter,
        header: merged.header ?? true,
        typeSpecs: merged.typeSpecs,
        alignHints: merged.aligns,
        hide: merged.hide,
      }),
    [text, merged, defaultDelimiter],
  );

  return (
    <DataGrid
      columns={table.columns}
      rows={table.rows}
      options={merged}
      storage={storage}
      storageKey={storageKey}
      rawLang={rawLang}
      rawMeta={rawMeta}
      rawSource={rawSource ?? text}
    />
  );
}
