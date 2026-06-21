// AI REVIEW NOTES — selection layer (feature map: notes/NotesContext.tsx).
//
// Mounts inside the viewer. Two jobs:
//   1. Text selected in `.fv-mdx-body` → a floating "+ Note" button → a small
//      composer; saving captures { quote, nearest heading, source line,
//      anchorIndex } and calls NotesContext.add().
//   2. Click on a highlighted span → hit-test the caret against each note's
//      range (CSS highlights aren't clickable) → NotesContext.locateAt() opens
//      + flashes that note in the panel.
//
// All references for a note: the exact QUOTE (find/replace anchor), the nearest
// HEADING (which section), and the source LINE — from the stamped data-line
// (remarkSourceLine), with a raw-markdown text search as fallback.
import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { useNotes } from "./NotesContext";
import { anchorIndexOf } from "./highlight";
import {
  BODY_SELECTOR,
  DATA_LINE_ATTR,
  DATA_LINE_END_ATTR,
  HEADING_SELECTOR,
  LINE_SEARCH_MIN_NEEDLE,
  LINE_SEARCH_PREFIX_LENGTHS,
  MIN_SELECTION_LENGTH,
} from "./constants";
import type { NotesLayerProps } from "./types";

interface Pending {
  quote: string;
  heading: string;
  line: string;
  /** Flat-text index of the selection start — the note's stable anchor. */
  anchorIndex: number;
  /** Anchor rect (viewport coords) for positioning the button/composer. */
  x: number;
  y: number;
}

/** Walk up from a DOM node to the nearest element with the given attribute
 *  (stamped by remarkSourceLine in @filemark/mdx). */
function attrLine(node: Node | null, attr: typeof DATA_LINE_ATTR | typeof DATA_LINE_END_ATTR): number | null {
  let el = node instanceof Element ? node : node?.parentElement ?? null;
  while (el) {
    const v = el.getAttribute?.(attr);
    if (v != null) {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) return n;
    }
    el = el.parentElement;
  }
  return null;
}

/** Precise source-line reference from the stamped DOM: "42", "42–45", or "". */
function domLineRange(range: Range): string {
  const start = attrLine(range.startContainer, DATA_LINE_ATTR);
  if (start == null) return "";
  const end =
    attrLine(range.endContainer, DATA_LINE_ATTR) ??
    attrLine(range.startContainer, DATA_LINE_END_ATTR) ??
    start;
  if (end === start) return String(start);
  return start < end ? `${start}–${end}` : `${end}–${start}`;
}

/**
 * Fallback when the DOM isn't stamped (rare — custom components rendered via
 * raw HTML): search the raw markdown for the selected text. Pure string ops,
 * cannot crash. Returns a 1-based line number string, or "".
 */
function findLine(source: string, quote: string): string {
  if (!source) return "";
  const lines = source.split("\n");
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const needle = norm(quote.split("\n")[0] ?? "");
  if (needle.length < LINE_SEARCH_MIN_NEEDLE) return "";
  // Try progressively shorter prefixes so a partial/formatted match still
  // resolves to the right line.
  for (const len of [needle.length, ...LINE_SEARCH_PREFIX_LENGTHS]) {
    if (len < LINE_SEARCH_MIN_NEEDLE) break;
    const frag = needle.slice(0, len);
    for (let i = 0; i < lines.length; i++) {
      if (norm(lines[i]!).includes(frag)) return String(i + 1);
    }
  }
  return "";
}

/** Walk the rendered body's headings and return the text of the last one that
 *  starts at or before the selection — i.e. the section the selection is in. */
function nearestHeading(body: HTMLElement, range: Range): string {
  const headings = Array.from(
    body.querySelectorAll<HTMLElement>(HEADING_SELECTOR),
  );
  let found = "";
  for (const h of headings) {
    // DOCUMENT_POSITION_FOLLOWING (4) = h comes after the range start → stop.
    const pos = range.startContainer.compareDocumentPosition(h);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) break;
    found = h.textContent?.trim() ?? "";
  }
  return found;
}

export function NotesLayer({ source, onRequestOpen }: NotesLayerProps) {
  const { add, update, locateAt } = useNotes();
  // Raw markdown of the active file (host-provided) — the source-line search
  // fallback. Held in a ref so the document listeners stay stable.
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const [pending, setPending] = useState<Pending | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Capture the selection on mouse/keyboard release.
  useEffect(() => {
    const onUp = () => {
      // Don't clobber an open composer.
      if (composing) return;
      const sel = window.getSelection();
      const text = sel?.toString() ?? "";
      if (!sel || sel.isCollapsed || text.trim().length < MIN_SELECTION_LENGTH) {
        setPending(null);
        return;
      }
      const range = sel.getRangeAt(0);
      // Only inside the rendered markdown body.
      const node = range.commonAncestorContainer;
      const el = node instanceof Element ? node : node.parentElement;
      const body = el?.closest(BODY_SELECTOR) as HTMLElement | null;
      if (!body) {
        setPending(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setPending({
        quote: text,
        heading: nearestHeading(body, range),
        // Precise DOM-stamped line first; source-text search as fallback.
        line: domLineRange(range) || findLine(sourceRef.current, text),
        anchorIndex: anchorIndexOf(body, range),
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("keyup", onUp);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("keyup", onUp);
    };
  }, [composing]);

  // Click a highlighted span → find which note it belongs to (CSS highlights
  // aren't clickable, so hit-test the caret position against each note's
  // range) and open + flash that note in the panel.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // A drag-select also ends in a click — ignore unless it's a plain click.
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;
      const target = e.target as Element | null;
      if (!target?.closest?.(BODY_SELECTOR)) return;
      const caret = document.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (!caret) return;
      if (locateAt(caret.startContainer, caret.startOffset)) {
        onRequestOpen?.();
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [locateAt, onRequestOpen]);

  const startCompose = () => {
    setComposing(true);
    setDraft("");
  };

  const saveNote = () => {
    if (!pending) return;
    const id = add({
      quote: pending.quote,
      heading: pending.heading,
      line: pending.line,
      anchorIndex: pending.anchorIndex,
    });
    if (draft.trim()) update(id, draft.trim());
    window.getSelection()?.removeAllRanges();
    setPending(null);
    setComposing(false);
    setDraft("");
    onRequestOpen?.();
  };

  const cancel = () => {
    setPending(null);
    setComposing(false);
    setDraft("");
  };

  if (!pending) return <div ref={rootRef} />;

  // Position above the selection, clamped to the viewport.
  const top = Math.max(8, pending.y - (composing ? 130 : 44));
  const left = Math.min(
    Math.max(12, pending.x - (composing ? 150 : 50)),
    window.innerWidth - (composing ? 312 : 120),
  );

  return (
    <div ref={rootRef}>
      <div className="fixed z-50" style={{ top, left }}>
        {!composing ? (
          <button
            type="button"
            // Preserve the live selection (mousedown would otherwise collapse
            // it before onClick captures the range).
            onMouseDown={(e) => e.preventDefault()}
            onClick={startCompose}
            className="bg-foreground text-background inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium shadow-lg"
          >
            <MessageSquarePlus className="size-3.5" />
            Add note
          </button>
        ) : (
          <div className="bg-popover w-[300px] rounded-lg border p-2.5 shadow-xl">
            <div className="text-muted-foreground mb-1.5 line-clamp-2 text-[11px] italic">
              “{pending.quote.replace(/\s+/g, " ").trim()}”
            </div>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote();
                if (e.key === "Escape") cancel();
              }}
              placeholder="Instruction for the AI… (⌘↵ to save)"
              rows={3}
              className="border-input bg-background w-full resize-none rounded-md border px-2 py-1.5 text-[13px] outline-none"
            />
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={cancel}
                className="hover:bg-muted h-7 rounded-md px-2.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNote}
                className="bg-primary text-primary-foreground h-7 rounded-md px-3 text-xs font-medium hover:opacity-90"
              >
                Save note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
