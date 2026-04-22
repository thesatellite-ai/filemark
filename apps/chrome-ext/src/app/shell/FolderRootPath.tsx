import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useLibrary, type LibraryFolder } from "../store";
import { cn } from "@/lib/utils";

/**
 * Compact inline editor for a folder's absolute root path. FSA handles don't
 * expose absolute paths (Chrome security), so to enable "Open in editor" /
 * "Reveal in Finder" for folder files we ask the user to paste it once.
 */
export function FolderRootPath({ folder }: { folder: LibraryFolder }) {
  const setFolderRootPath = useLibrary((s) => s.setFolderRootPath);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(folder.rootPath ?? "");

  const save = () => {
    setFolderRootPath(folder.id, draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 pb-1 pt-0.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder={`/absolute/path/to/${folder.name}`}
          autoFocus
          className={cn(
            "bg-background text-foreground placeholder:text-muted-foreground/60 h-6 min-w-0 flex-1 rounded-sm border px-1.5 font-mono text-[11px] outline-none focus-visible:border-ring"
          )}
        />
        <button
          className="hover:bg-accent hover:text-accent-foreground rounded-sm p-1 text-green-500"
          onClick={save}
          aria-label="Save"
        >
          <Check className="size-3" />
        </button>
        <button
          className="hover:bg-accent hover:text-muted-foreground text-muted-foreground rounded-sm p-1"
          onClick={() => setEditing(false)}
          aria-label="Cancel"
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  if (!folder.rootPath) {
    return (
      <button
        className="hover:bg-accent hover:text-accent-foreground text-muted-foreground mx-2 mb-1 flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-[11px] italic transition-colors"
        onClick={() => {
          setDraft("");
          setEditing(true);
        }}
        title="Set the absolute path so Open in editor / Reveal in Finder light up"
      >
        <Pencil className="size-3" />
        Set root path…
      </button>
    );
  }

  return (
    <button
      className="hover:bg-accent text-muted-foreground mx-2 mb-1 flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-left font-mono text-[10px] transition-colors"
      onClick={() => {
        setDraft(folder.rootPath!);
        setEditing(true);
      }}
      title={`Root: ${folder.rootPath}`}
    >
      <Pencil className="size-3 shrink-0 opacity-70" />
      <span className="truncate">{folder.rootPath}</span>
    </button>
  );
}
