import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FileText, FolderClosed, RotateCcw, X } from "lucide-react";
import FlexSearch from "flexsearch";
import { useLibrary, type LibraryFile, type LibraryFolder } from "../store";
import { sessionHandles } from "../sessionHandles";
import { readFileAsText } from "../fs";
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Hit {
  id: string;
  snippet: string;
  name: string;
  /** Full display path for disambiguation — see `locationLabelFor`. */
  location: string;
  /** Short origin tag: folder name, "Dropped", or absolute dir. */
  origin: string;
}

interface FlexDoc {
  add(doc: { id: string; name: string; content: string }): void;
  searchAsync(q: string, opts: { limit: number }): Promise<unknown>;
}

export function SearchPalette({
  open,
  onOpenChange,
  scope,
  onScopeChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When set, restrict the search index + results to files in this
   *  folder. Null = search every loaded file. */
  scope?: string | null;
  onScopeChange?: (next: string | null) => void;
}) {
  const files = useLibrary((s) => s.files);
  const folders = useLibrary((s) => s.folders);
  const setActive = useLibrary((s) => s.setActive);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const idxRef = useRef<FlexDoc | null>(null);
  const contentsRef = useRef<Map<string, string>>(new Map());

  // `@mention` picker state. Opens when the input starts with `@` and
  // the user is still typing the token (no space yet). User picks a
  // folder with arrows + Enter or by clicking; selection sets scope
  // and strips the `@token` from the input.
  const [pickerIdx, setPickerIdx] = useState(0);
  const [pickerDismissed, setPickerDismissed] = useState(false);
  const atTokenMatch = /^@([^\s]*)$/s.exec(q);
  const atToken = atTokenMatch ? atTokenMatch[1]! : null;
  const pickerOpen = atToken !== null && !pickerDismissed;

  // Filtered folder list for the picker. Match by label OR name OR
  // rootPath (so two folders named "notes" with different parent dirs
  // are both pickable + visually distinguishable).
  const pickerOptions = useMemo(() => {
    if (atToken === null) return [];
    const lower = atToken.toLowerCase();
    return Object.values(folders).filter((f) => {
      const label = (f.label ?? "").toLowerCase();
      const name = (f.name ?? "").toLowerCase();
      return label.includes(lower) || name.includes(lower);
    });
  }, [folders, atToken]);

  // Reset picker selection when filter or open-state changes.
  useEffect(() => {
    setPickerIdx(0);
  }, [atToken, pickerOpen]);

  // When the input no longer starts with `@…`, reset the dismissed flag
  // so the next `@` re-opens the picker.
  useEffect(() => {
    if (atToken === null && pickerDismissed) setPickerDismissed(false);
  }, [atToken, pickerDismissed]);

  // Active scope: prop scope only — picker commits set the prop scope
  // via onScopeChange and strip the `@token` from the input.
  const activeScope = scope ?? null;
  const effectiveQuery = q;

  // Files in the current scope. When `activeScope` is null we search
  // every loaded file; when set we filter by folderId.
  const scopedFiles = useMemo<Record<string, LibraryFile>>(() => {
    if (!activeScope) return files;
    const out: Record<string, LibraryFile> = {};
    for (const [id, f] of Object.entries(files)) {
      if (f.folderId === activeScope) out[id] = f;
    }
    return out;
  }, [files, activeScope]);

  const scopeFolder = activeScope ? folders[activeScope] : null;
  const scopeLabel =
    scopeFolder?.label ||
    scopeFolder?.name ||
    (activeScope ? "(unknown folder)" : "");

  const commitPickerSelection = (folder: LibraryFolder) => {
    onScopeChange?.(folder.id);
    setQ("");
    setPickerDismissed(true);
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const built = await buildIndex(scopedFiles);
      if (cancelled) return;
      idxRef.current = built.idx;
      contentsRef.current = built.contents;
    })();
    return () => {
      cancelled = true;
    };
  }, [scopedFiles, open]);

  useEffect(() => {
    if (!effectiveQuery.trim()) {
      setHits([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const idx = idxRef.current;
      if (!idx) return;
      const raw = (await idx.searchAsync(effectiveQuery, { limit: 30 })) as {
        field: string;
        result: string[];
      }[];
      if (cancelled) return;
      const ids = new Set<string>();
      for (const f of raw) for (const id of f.result) ids.add(id);
      const results: Hit[] = [];
      for (const id of ids) {
        const f = scopedFiles[id];
        if (!f) continue;
        const content = contentsRef.current.get(id) ?? "";
        const folder = f.folderId ? folders[f.folderId] : null;
        results.push({
          id,
          name: f.name,
          location: locationLabelFor(f, folder),
          origin: originTagFor(f, folder),
          snippet: snippet(content, effectiveQuery),
        });
        if (results.length >= 30) break;
      }
      setHits(results);
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveQuery, scopedFiles, folders]);

  // Whenever hits change, force the cmdk list to scroll to the top.
  // cmdk's scroll-into-view logic preserves stale positions across query
  // refinements even after a remount; resetting imperatively here is the
  // only reliable way to keep the most-relevant top result in view.
  useLayoutEffect(() => {
    const list = document.querySelector(
      "[cmdk-list]"
    ) as HTMLElement | null;
    if (list) list.scrollTop = 0;
  }, [hits]);

  // Force-focus the cmdk input each time the palette opens. Radix's
  // dialog auto-focus runs on first mount but can be skipped on
  // subsequent opens when state persists — without this the user has
  // to click the input every time after the first session.
  //
  // Radix mounts the dialog content via Portal in a microtask after
  // `open` flips, so an immediate `requestAnimationFrame` fires before
  // the input exists. We retry on a short interval until the input is
  // findable (cap ~200ms / 10 attempts).
  useEffect(() => {
    if (!open) return;
    let attempts = 0;
    let cancelled = false;
    const tryFocus = () => {
      if (cancelled) return;
      attempts++;
      const input = document.querySelector<HTMLInputElement>(
        "[cmdk-input]",
      );
      if (input) {
        input.focus();
        // Select-all so a fresh keystroke replaces the last query — but
        // arrow keys still navigate, and Enter commits the highlighted
        // hit unchanged.
        input.select();
        return;
      }
      if (attempts < 10) setTimeout(tryFocus, 20);
    };
    tryFocus();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const select = (id: string) => {
    setActive(id);
    onOpenChange(false);
    // Intentionally NOT clearing `q` or scope — keeping them lets the
    // user re-open the palette and see their previous search restored,
    // which is the common "open file → realize wrong → re-open and
    // pick another" loop. Use the Reset button or the chip ✕ to clear.
  };

  const resetSearch = () => {
    setQ("");
    setPickerDismissed(false);
    onScopeChange?.(null);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search across loaded files"
      shouldFilter={false}
      showCloseButton={false}
    >
      {activeScope && scopeFolder && (
        <div className="border-border/60 flex flex-wrap items-center gap-2 border-b px-3 py-1.5 text-[11px]">
          <FolderClosed className="text-muted-foreground size-3.5 shrink-0" />
          <span className="text-muted-foreground">Scoped to</span>
          <span
            className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium"
            title={`Searching only in "${scopeLabel}". Use Reset (top-right) to widen.`}
          >
            <span className="max-w-[180px] truncate">{scopeLabel}</span>
          </span>
          <span className="text-muted-foreground tabular-nums">
            {Object.keys(scopedFiles).length} file
            {Object.keys(scopedFiles).length === 1 ? "" : "s"}
          </span>
        </div>
      )}
      {!activeScope && Object.keys(folders).length > 0 && (
        <div className="text-muted-foreground border-border/60 px-3 py-1 text-[10.5px]">
          Tip: type <code className="bg-muted rounded px-1">@</code> to pick a folder to scope to.
        </div>
      )}
      <div className="relative">
        {/* Reset + close cluster vertically centered with the input row.
            `inset-y-0` + `items-center` keeps them on the row's baseline
            regardless of the input's exact height. Replaces the dialog's
            built-in close X so we don't end up with two crosses. */}
        <div className="absolute inset-y-0 right-2 z-20 flex items-center gap-1">
          {(q || activeScope) && (
            <button
              type="button"
              onClick={resetSearch}
              className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] leading-none transition-colors"
              title="Reset search (clears query and scope)"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-6 items-center justify-center rounded transition-colors"
            aria-label="Close"
            title="Close (Esc)"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <CommandInput
          placeholder={
            activeScope && scopeFolder
              ? `Search in "${scopeLabel}"…`
              : "Search across all loaded files… (type @ to scope)"
          }
          value={q}
          onValueChange={setQ}
          onKeyDown={(e) => {
            if (pickerOpen && pickerOptions.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setPickerIdx((i) => (i + 1) % pickerOptions.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setPickerIdx((i) =>
                  (i - 1 + pickerOptions.length) % pickerOptions.length,
                );
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                const f = pickerOptions[pickerIdx];
                if (f) commitPickerSelection(f);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setPickerDismissed(true);
                return;
              }
            }
            // Backspace on empty query → clear scope.
            if (e.key === "Backspace" && q === "" && activeScope) {
              e.preventDefault();
              onScopeChange?.(null);
            }
          }}
        />
        {pickerOpen && (
          <ScopePicker
            options={pickerOptions}
            activeIdx={pickerIdx}
            onHover={setPickerIdx}
            onSelect={commitPickerSelection}
            token={atToken!}
          />
        )}
      </div>
      {/*
       * Key the list on query + top-hit id so cmdk's internal active-item
       * tracker resets both (a) when the user types — instantly remounts
       * before async results land — and (b) when async results arrive and
       * change the top hit. Without this second leg, cmdk preserves the
       * previously-active item across hit changes and auto-scrolls the
       * list to keep it in view (e.g. for "task pl", top result shifts to
       * TASKS_PLAN.md but cmdk stays on whatever was active from "task p"
       * and scrolls past the actually-relevant top result).
       */}
      <CommandList key={q + "::" + (hits[0]?.id ?? "")}>
        {q && hits.length === 0 && <CommandEmpty>No matches</CommandEmpty>}
        {hits.map((h) => (
          <CommandItem
            key={h.id}
            value={h.id}
            onSelect={() => select(h.id)}
            className="flex flex-col items-start gap-0.5 py-2"
          >
            <div className="flex w-full items-center gap-2">
              <FileText className="text-muted-foreground size-3.5 shrink-0" />
              <span className="truncate font-medium">{h.name}</span>
              <span className="bg-muted text-muted-foreground ml-auto shrink-0 rounded px-1.5 py-[1px] text-[10px] font-medium">
                {h.origin}
              </span>
            </div>
            <div
              className="text-muted-foreground ml-5 w-full truncate font-mono text-[11px]"
              title={h.location}
            >
              {/* Pre-shortened to keep the last 3 path segments visible —
                  filename + two parent dirs — even for deeply nested files. */}
              {shortenPath(h.location)}
            </div>
            {h.snippet && (
              <div className="text-muted-foreground ml-5 line-clamp-1 text-[11px]">
                {h.snippet}
              </div>
            )}
          </CommandItem>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

async function buildIndex(
  files: Record<string, LibraryFile>
): Promise<{ idx: FlexDoc; contents: Map<string, string> }> {
  const idx = new (FlexSearch as unknown as {
    Document: new (opts: unknown) => FlexDoc;
  }).Document({
    document: { id: "id", index: ["name", "content"] },
    tokenize: "forward",
  });
  const contents = new Map<string, string>();
  for (const f of Object.values(files)) {
    let content = f.content ?? "";
    if (!content && f.folderId) {
      const handle = sessionHandles.getFile(f.folderId, f.id);
      if (handle) {
        try {
          content = await readFileAsText(handle);
        } catch {
          content = "";
        }
      }
    }
    contents.set(f.id, content);
    idx.add({ id: f.id, name: f.name, content });
  }
  return { idx, contents };
}

/**
 * Full display path for a hit — chosen so two files with the same name are
 * always distinguishable:
 *
 *  - file:// intercepted: absolute path from `sourceUrl`
 *    e.g. `/Users/khanakia/docs/private/PLAN.md`
 *  - folder-picked: `<folder.rootPath>/<rel>` when the user set a root path;
 *    otherwise `<folder.name>/<rel>` so the owning folder is visible
 *  - drag-drop loose: `Dropped · <filename>`
 */
function locationLabelFor(
  f: LibraryFile,
  folder: LibraryFolder | null
): string {
  if (f.sourceUrl && f.sourceUrl.startsWith("file://")) {
    try {
      return decodeURIComponent(new URL(f.sourceUrl).pathname);
    } catch {
      /* fall through */
    }
  }
  if (folder) {
    const prefix = folder.rootPath?.replace(/\/+$/, "") ?? folder.name;
    return `${prefix}/${f.path}`;
  }
  return `Dropped · ${f.path}`;
}

/** Short badge shown on the right of each hit — quick visual for origin. */
function originTagFor(f: LibraryFile, folder: LibraryFolder | null): string {
  if (f.sourceUrl && f.sourceUrl.startsWith("file://")) return "file";
  if (folder) return folder.name;
  return "dropped";
}

/**
 * Shorten a path so the filename and its immediate parent directories stay
 * visible. Right-truncating would cut off the filename (the most useful
 * part for disambiguation), so we front-truncate instead.
 *
 * Rules:
 *  - ≤ 3 segments → unchanged
 *  - > 3 segments → `…/<last 3 segments>`
 *  - segments after trimming the front still too long for the row → plain
 *    CSS `truncate` will handle the tail as a last resort
 */
function shortenPath(path: string, keep = 3): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= keep) return path;
  const prefix = path.startsWith("/") ? "" : "";
  return `${prefix}…/${parts.slice(-keep).join("/")}`;
}

function snippet(content: string, q: string): string {
  if (!content) return "";
  const lower = content.toLowerCase();
  const query = q.toLowerCase();
  const pos = lower.indexOf(query);
  if (pos < 0) return content.slice(0, 160).replace(/\s+/g, " ").trim();
  const start = Math.max(0, pos - 60);
  const end = Math.min(content.length, pos + query.length + 100);
  return (
    (start > 0 ? "…" : "") +
    content.slice(start, end).replace(/\s+/g, " ").trim()
  );
}

/**
 * @mention-style picker that drops below the search input when the user
 * types `@`. Lists all folders matching the typed token (or all folders
 * when token is empty). Each row shows label/name + parent dir so two
 * folders with the same name are visually distinct.
 */
function ScopePicker({
  options,
  activeIdx,
  onHover,
  onSelect,
  token,
}: {
  options: LibraryFolder[];
  activeIdx: number;
  onHover: (idx: number) => void;
  onSelect: (folder: LibraryFolder) => void;
  token: string;
}) {
  if (options.length === 0) {
    return (
      <div className="bg-popover absolute left-0 right-0 top-full z-30 mt-1 rounded-md border shadow-md">
        <div className="text-muted-foreground px-3 py-2 text-xs italic">
          No folders match {token ? `"${token}"` : ""} — type to filter or pick from drag/drop folders.
        </div>
      </div>
    );
  }
  return (
    <div className="bg-popover absolute left-0 right-0 top-full z-30 mt-1 max-h-[260px] overflow-y-auto rounded-md border shadow-md">
      {options.map((f, i) => {
        const display = f.label || f.name || "(unnamed folder)";
        const subtitle = parentSubtitle(f);
        const active = i === activeIdx;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f)}
            onMouseEnter={() => onHover(i)}
            className={[
              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50",
            ].join(" ")}
          >
            <FolderClosed className="text-muted-foreground size-3.5 shrink-0" />
            <span className="truncate font-medium">{display}</span>
            {subtitle && (
              <span className="text-muted-foreground ml-auto truncate text-[10.5px]">
                {subtitle}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function parentSubtitle(folder: LibraryFolder): string {
  if (!folder.rootPath) return "";
  const trimmed = folder.rootPath.replace(/\/+$/, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length <= 1) return trimmed;
  return ".../" + parts.slice(-2).join("/");
}
