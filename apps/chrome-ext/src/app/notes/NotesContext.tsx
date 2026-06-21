// =============================================================================
// AI REVIEW NOTES — feature hub (read this first)
// =============================================================================
// Highlight text in a rendered markdown doc, attach an instruction note for an
// AI agent, review them in a sidebar, copy them all as plain text, paste to the
// agent. Ephemeral by design — see NON-GOALS below.
//
// FILE MAP (everything for this feature):
//   notes/NotesContext.tsx  — THIS FILE. State + the highlight engine. Owns the
//                             notes array, re-resolves highlight Ranges from the
//                             DOM, and builds the clipboard export. The single
//                             source of truth; all UI reads `useNotes()`.
//   notes/highlight.ts      — Pure helpers: flatten the body's text, find a
//                             quote in the live DOM, build a Range (resolveRange),
//                             compute a selection's anchor index (anchorIndexOf).
//   notes/NotesLayer.tsx    — Mounted in the viewer. Detects a text selection →
//                             "+ Note" composer; click-on-highlight → locate note.
//                             Captures quote + nearest heading + source line.
//   notes/NotesPanel.tsx    — The right-rail sidebar: list, read-only + edit/save,
//                             delete, copy-all / copy-one, scroll-to + flash.
//
// INTEGRATION POINTS (outside notes/):
//   app/shell/Shell.tsx        — wraps content in <NotesProvider>, mounts
//                                <NotesLayer/>, renders <NotesPanel/> when open.
//   app/shell/TopBar.tsx       — StickyNote toolbar button → toggleNotesPanel.
//   app/store.ts               — `notesOpen` flag + toggleNotesPanel/openNotesPanel
//                                (panel visibility only; notes data lives here,
//                                NOT in the store, because it's ephemeral).
//   packages/mdx-viewer/src/remarkSourceLine.ts — stamps data-line on block
//                                elements so NotesLayer can report "line N".
//   app/styles/index.css       — ::highlight(fv-note) / ::highlight(fv-note-active).
//
// Full write-up + the bug history that shaped this: docsi/NOTES_FEATURE.md.
//
// NON-GOALS (by design): no persistence — notes live only in memory for the
// current view and are cleared on file switch / reload. No .md sidecar, no
// source injection, no note types/priority.
//
// THE HIGHLIGHT TRICK (why this file looks the way it does):
// Highlighting uses the CSS Custom Highlight API. Crucially we do NOT store a
// live DOM Range (those detach when shiki re-highlights a code block or React
// re-renders, and the highlight silently vanishes). Instead each note stores
// its quoted text + an anchor offset, and we RE-RESOLVE a fresh Range from the
// current DOM every time we rebuild — and we rebuild on every relevant DOM
// mutation via a MutationObserver. That makes highlights survive re-renders.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getBody, resolveRange } from "./highlight";
import {
  ACTIVE_HIGHLIGHT_NAME,
  ACTIVE_NOTE_DURATION_MS,
  DEFAULT_FILE_NAME,
  FLASH_DURATION_MS,
  HIGHLIGHT_NAME,
} from "./constants";
import type { Note, NotesApi, NotesProviderProps } from "./types";

const NotesContext = createContext<NotesApi | null>(null);

/** True when the browser supports the CSS Custom Highlight API (always in
 *  Chrome; guarded so the module degrades elsewhere). */
const hasHighlights = () => typeof CSS !== "undefined" && "highlights" in CSS;

/** The two plain-text lines that represent one note (shared by copy-all and
 *  copy-one): the reference line and the instruction line. */
function formatNote(n: Note, index: number): string[] {
  const parts: string[] = [];
  if (n.heading) parts.push(n.heading);
  if (n.line) parts.push(`line ${n.line}`);
  const ref = parts.length ? `${parts.join(" · ")} — ` : "";
  const quote = n.quote.replace(/\s+/g, " ").trim();
  return [
    `[${index + 1}] ${ref}"${quote}"`,
    `    → ${n.text.trim() || "(no instruction)"}`,
  ];
}

let seq = 0;
const nextId = () => `note-${++seq}`;

export function NotesProvider({ fileId, fileName, children }: NotesProviderProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileNameRef = useRef(fileName);
  fileNameRef.current = fileName;
  const notesRef = useRef(notes);
  notesRef.current = notes;
  // Freshly-resolved ranges per note id, rebuilt from the DOM.
  const rangeMap = useRef(new Map<string, Range>());

  // Re-resolve every note's Range against the current DOM and repaint the
  // highlight. Cheap; safe to call on every mutation.
  const rebuild = useCallback(() => {
    const body = getBody();
    const map = new Map<string, Range>();
    const ranges: Range[] = [];
    if (body) {
      for (const n of notesRef.current) {
        const r = resolveRange(body, n.quote, n.anchorIndex);
        if (r) {
          map.set(n.id, r);
          ranges.push(r);
        }
      }
    }
    rangeMap.current = map;
    if (!hasHighlights()) return;
    try {
      if (ranges.length) CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
      else CSS.highlights.delete(HIGHLIGHT_NAME);
    } catch {
      /* ignore */
    }
  }, []);

  // Repaint whenever the doc DOM changes (shiki lazy-render, theme swaps,
  // React reconciliation) so highlights survive. Only while notes exist.
  useEffect(() => {
    if (notes.length === 0) return;
    rebuild();
    let raf = 0;
    const obs = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(rebuild);
    });
    obs.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [notes, rebuild]);

  // Per-view: clear notes + highlight when the active file changes.
  useEffect(() => {
    setNotes([]);
    rangeMap.current = new Map();
    if (hasHighlights()) {
      CSS.highlights.delete(HIGHLIGHT_NAME);
      CSS.highlights.delete(ACTIVE_HIGHLIGHT_NAME);
    }
  }, [fileId]);

  const add: NotesApi["add"] = useCallback(({ quote, heading, line, anchorIndex }) => {
    const id = nextId();
    setNotes((prev) => [...prev, { id, quote, heading, line, anchorIndex, text: "" }]);
    return id;
  }, []);

  const update: NotesApi["update"] = useCallback((id, text) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  }, []);

  const remove: NotesApi["remove"] = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clear: NotesApi["clear"] = useCallback(() => {
    setNotes([]);
  }, []);

  const flash = useCallback((range: Range) => {
    if (!hasHighlights()) return;
    try {
      CSS.highlights.set(ACTIVE_HIGHLIGHT_NAME, new Highlight(range));
      window.setTimeout(() => CSS.highlights.delete(ACTIVE_HIGHLIGHT_NAME), FLASH_DURATION_MS);
    } catch {
      /* ignore */
    }
  }, []);

  const scrollTo: NotesApi["scrollTo"] = useCallback(
    (id) => {
      const range = rangeMap.current.get(id);
      if (!range) return;
      const el =
        range.startContainer.nodeType === Node.TEXT_NODE
          ? range.startContainer.parentElement
          : (range.startContainer as Element);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      flash(range);
    },
    [flash],
  );

  const locateAt: NotesApi["locateAt"] = useCallback(
    (node, offset) => {
      let hitId: string | null = null;
      let hitRange: Range | null = null;
      for (const [id, range] of rangeMap.current) {
        try {
          if (range.isPointInRange(node, offset)) {
            hitId = id;
            hitRange = range;
            break;
          }
        } catch {
          /* stale — skip */
        }
      }
      if (!hitId || !hitRange) return false;
      setActiveId(hitId);
      flash(hitRange);
      window.setTimeout(
        () => setActiveId((c) => (c === hitId ? null : c)),
        ACTIVE_NOTE_DURATION_MS,
      );
      return true;
    },
    [flash],
  );

  const buildExport: NotesApi["buildExport"] = useCallback(() => {
    const name = fileNameRef.current || DEFAULT_FILE_NAME;
    if (notes.length === 0) return `# Notes for ${name}\n\n(no notes)\n`;
    const lines = [`# Notes for ${name}`, ""];
    notes.forEach((n, i) => {
      lines.push(...formatNote(n, i), "");
    });
    return lines.join("\n");
  }, [notes]);

  const buildOne: NotesApi["buildOne"] = useCallback(
    (id) => {
      const i = notes.findIndex((n) => n.id === id);
      if (i < 0) return "";
      const name = fileNameRef.current || DEFAULT_FILE_NAME;
      return [`# Note for ${name}`, "", ...formatNote(notes[i]!, i)].join("\n");
    },
    [notes],
  );

  const api = useMemo<NotesApi>(
    () => ({
      notes,
      activeId,
      locateAt,
      add,
      update,
      remove,
      clear,
      scrollTo,
      buildExport,
      buildOne,
    }),
    [notes, activeId, locateAt, add, update, remove, clear, scrollTo, buildExport, buildOne],
  );

  return <NotesContext.Provider value={api}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesApi {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within <NotesProvider>");
  return ctx;
}
