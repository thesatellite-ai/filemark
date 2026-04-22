import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const files = useLibrary((s) => s.files);
  const folders = useLibrary((s) => s.folders);
  const setActive = useLibrary((s) => s.setActive);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const idxRef = useRef<FlexDoc | null>(null);
  const contentsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const built = await buildIndex(files);
      if (cancelled) return;
      idxRef.current = built.idx;
      contentsRef.current = built.contents;
    })();
    return () => {
      cancelled = true;
    };
  }, [files, open]);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const idx = idxRef.current;
      if (!idx) return;
      const raw = (await idx.searchAsync(q, { limit: 30 })) as {
        field: string;
        result: string[];
      }[];
      if (cancelled) return;
      const ids = new Set<string>();
      for (const f of raw) for (const id of f.result) ids.add(id);
      const results: Hit[] = [];
      for (const id of ids) {
        const f = files[id];
        if (!f) continue;
        const content = contentsRef.current.get(id) ?? "";
        const folder = f.folderId ? folders[f.folderId] : null;
        results.push({
          id,
          name: f.name,
          location: locationLabelFor(f, folder),
          origin: originTagFor(f, folder),
          snippet: snippet(content, q),
        });
        if (results.length >= 30) break;
      }
      setHits(results);
    })();
    return () => {
      cancelled = true;
    };
  }, [q, files, folders]);

  const select = (id: string) => {
    setActive(id);
    onOpenChange(false);
    setQ("");
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search across loaded files"
      shouldFilter={false}
    >
      <CommandInput
        placeholder="Search across all loaded files…"
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
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
