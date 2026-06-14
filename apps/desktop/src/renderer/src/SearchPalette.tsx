import { useEffect, useRef, useState } from "react";
import FlexSearch from "flexsearch";
import type { ProjectDTO } from "../../preload";

export interface FileHit {
  projectId: string;
  rootPath: string;
  id: string;
  relPath: string;
  ext: string;
}

interface Props {
  projects: ProjectDTO[];
  onPick: (f: FileHit) => void;
  onClose: () => void;
}

interface Doc {
  id: string;
  name: string;
  content: string;
  meta: FileHit;
}

// Mirrors apps/chrome-ext SearchPalette: index built lazily on open
// (reading every file is deferred until the user actually searches),
// FlexSearch Document over name+content, snippet around first match.
export function SearchPalette({ projects, onPick, onClose }: Props): React.ReactElement {
  const [q, setQ] = useState("");
  const [ready, setReady] = useState(false);
  const [hits, setHits] = useState<{ meta: FileHit; snippet: string }[]>([]);
  const [sel, setSel] = useState(0);
  const idxRef = useRef<FlexSearch.Document<Doc, true> | null>(null);
  const docsRef = useRef<Map<string, Doc>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    let cancelled = false;
    (async () => {
      const index = new FlexSearch.Document<Doc, true>({
        document: { id: "id", index: ["name", "content"], store: true },
        tokenize: "forward",
      });
      for (const p of projects) {
        for (const f of p.files) {
          const content =
            (await window.filemark.files.read(p.rootPath, f.relPath)) ?? "";
          if (cancelled) return;
          const meta: FileHit = {
            projectId: p.id,
            rootPath: p.rootPath,
            id: f.id,
            relPath: f.relPath,
            ext: f.ext,
          };
          const doc: Doc = { id: f.id, name: f.relPath, content, meta };
          docsRef.current.set(f.id, doc);
          index.add(doc);
        }
      }
      if (cancelled) return;
      idxRef.current = index;
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [projects]);

  useEffect(() => {
    if (!ready || !idxRef.current || !q.trim()) {
      setHits([]);
      return;
    }
    const res = idxRef.current.search(q, { limit: 20, enrich: true });
    const seen = new Set<string>();
    const out: { meta: FileHit; snippet: string }[] = [];
    for (const field of res) {
      for (const r of field.result) {
        // enrich:true → entries are { id, doc }; fall back to raw id.
        const id = String(
          typeof r === "object" && r !== null && "id" in r
            ? (r as { id: unknown }).id
            : r,
        );
        if (seen.has(id)) continue;
        seen.add(id);
        const doc = docsRef.current.get(id);
        if (!doc) continue;
        const i = doc.content.toLowerCase().indexOf(q.toLowerCase());
        const snippet =
          i >= 0
            ? doc.content.slice(Math.max(0, i - 40), i + 60).replace(/\s+/g, " ")
            : doc.name;
        out.push({ meta: doc.meta, snippet });
      }
    }
    setHits(out);
    setSel(0);
  }, [q, ready]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start bg-black/40 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="mx-auto w-[640px] max-w-[90vw] overflow-hidden rounded-lg border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowDown")
              setSel((s) => Math.min(s + 1, hits.length - 1));
            else if (e.key === "ArrowUp") setSel((s) => Math.max(s - 1, 0));
            else if (e.key === "Enter" && hits[sel]) onPick(hits[sel].meta);
          }}
          placeholder={ready ? "Search files…" : "Indexing…"}
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none"
        />
        <div className="max-h-[50vh] overflow-auto">
          {hits.map((h, i) => (
            <button
              key={h.meta.id}
              onClick={() => onPick(h.meta)}
              className={`block w-full px-4 py-2 text-left ${
                i === sel ? "bg-muted" : "hover:bg-muted/60"
              }`}
            >
              <div className="truncate text-sm font-medium">{h.meta.relPath}</div>
              <div className="truncate text-xs text-muted-foreground">
                {h.snippet}
              </div>
            </button>
          ))}
          {ready && q.trim() && hits.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
