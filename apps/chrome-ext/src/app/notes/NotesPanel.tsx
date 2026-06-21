// AI REVIEW NOTES — sidebar panel (feature map: notes/NotesContext.tsx).
//
// Right-rail panel listing all notes for the current view. Each card is
// read-only by default (pencil → edit → save). Per-note copy + delete; header
// "Copy all for AI" + Clear. Clicking a card's quote scrolls to + flashes its
// highlight (scrollTo); when a note is flagged `activeId` (you clicked its
// highlight in the doc), the matching card scrolls into view + rings amber.
// Mirrors TaskPanel's shell placement (rendered by Shell when notesOpen).
import { useEffect, useRef, useState } from "react";
import { Copy, Check, Trash2, X, StickyNote, Pencil } from "lucide-react";
import { useNotes } from "./NotesContext";
import type { NotesPanelProps } from "./types";

export function NotesPanel({ onClose }: NotesPanelProps) {
  const { notes, activeId, update, remove, clear, scrollTo, buildExport, buildOne } =
    useNotes();
  const listRef = useRef<HTMLDivElement>(null);

  // When a note is flagged active (e.g. you clicked its highlight in the doc),
  // scroll its card into view.
  useEffect(() => {
    if (!activeId) return;
    const card = listRef.current?.querySelector<HTMLElement>(
      `[data-note-id="${activeId}"]`,
    );
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId]);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyNote = async (id: string) => {
    try {
      await navigator.clipboard.writeText(buildOne(id));
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  // Which note is being edited, + its in-progress text.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setDraft(text);
  };
  const saveEdit = () => {
    if (editingId) update(editingId, draft.trim());
    setEditingId(null);
    setDraft("");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(buildExport());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <aside className="bg-background flex h-full w-80 shrink-0 flex-col">
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <StickyNote className="text-primary size-4" />
          Notes
          <span className="text-muted-foreground text-xs font-normal">
            {notes.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close notes"
          aria-label="Close notes"
          className="hover:bg-muted grid size-7 place-items-center rounded-md"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="flex items-center gap-1.5 border-b px-3 py-2">
        <button
          type="button"
          onClick={copyAll}
          disabled={notes.length === 0}
          className="bg-primary text-primary-foreground inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium hover:opacity-90 disabled:opacity-40"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy all for AI"}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={notes.length === 0}
          title="Clear all notes"
          className="hover:bg-muted text-muted-foreground inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {notes.length === 0 ? (
          <div className="text-muted-foreground px-2 py-8 text-center text-xs leading-relaxed">
            Select text in the document and click{" "}
            <span className="text-foreground font-medium">Add note</span> to
            leave an instruction for the AI. Notes aren't saved — copy them out
            when you're done.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {notes.map((n, i) => {
              const ref = [n.heading, n.line ? `line ${n.line}` : ""]
                .filter(Boolean)
                .join(" · ");
              const editing = editingId === n.id;
              return (
                <li
                  key={n.id}
                  data-note-id={n.id}
                  className={`bg-card rounded-lg border p-2.5 text-[13px] transition-shadow ${
                    activeId === n.id
                      ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-background"
                      : ""
                  }`}
                >
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => scrollTo(n.id)}
                      title="Jump to where this note was added"
                      className="group/loc min-w-0 text-left"
                    >
                      <span className="text-muted-foreground group-hover/loc:text-foreground block truncate text-[10px] font-medium uppercase tracking-wide">
                        {i + 1}
                        {ref ? ` · ${ref}` : ""}
                      </span>
                      <span className="text-muted-foreground/90 group-hover/loc:text-foreground/90 line-clamp-2 text-[11px] italic underline decoration-dotted underline-offset-2">
                        “{n.quote.replace(/\s+/g, " ").trim()}”
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => copyNote(n.id)}
                        title="Copy this note"
                        aria-label="Copy this note"
                        className="hover:bg-muted text-muted-foreground hover:text-foreground grid size-6 place-items-center rounded"
                      >
                        {copiedId === n.id ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                      {!editing && (
                        <button
                          type="button"
                          onClick={() => startEdit(n.id, n.text)}
                          title="Edit note"
                          aria-label="Edit note"
                          className="hover:bg-muted text-muted-foreground hover:text-foreground grid size-6 place-items-center rounded"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(n.id)}
                        title="Delete note"
                        aria-label="Delete note"
                        className="hover:bg-muted hover:text-destructive text-muted-foreground grid size-6 place-items-center rounded"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {editing ? (
                    <>
                      <textarea
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                            saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        placeholder="Instruction for the AI…"
                        rows={3}
                        className="border-input bg-background w-full resize-none rounded-md border px-2 py-1.5 text-[13px] outline-none"
                      />
                      <div className="mt-1.5 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="hover:bg-muted h-7 rounded-md px-2.5 text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="bg-primary text-primary-foreground h-7 rounded-md px-3 text-xs font-medium hover:opacity-90"
                        >
                          Save
                        </button>
                      </div>
                    </>
                  ) : n.text.trim() ? (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {n.text}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(n.id, "")}
                      className="text-muted-foreground/70 hover:text-foreground text-[12px] italic"
                    >
                      Add an instruction…
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
