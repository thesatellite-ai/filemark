// AI REVIEW NOTES — shared types (feature map: notes/NotesContext.tsx).
import type { ReactNode } from "react";

/**
 * A single review note. Note what it deliberately does NOT hold: a live DOM
 * `Range`. Ranges detach when shiki re-renders a code block, so highlights are
 * re-resolved from `quote` + `anchorIndex` instead (see highlight.ts / NOTES-5
 * in NOTES_FEATURE.md).
 */
export interface Note {
  /** Stable id for this note (per session). */
  id: string;
  /** The highlighted text — the AI's find/replace anchor. */
  quote: string;
  /** Nearest preceding heading text ("which section"). Empty if none. */
  heading: string;
  /** Source line reference, e.g. "42" or "42–45". Empty if unknown. */
  line: string;
  /** Flat-text index of the quote's start in the body — disambiguates repeated
   *  text when re-resolving the highlight range. */
  anchorIndex: number;
  /** The user's instruction for the AI. */
  text: string;
}

/** Input to create a note (the resolved anchor + references). */
export interface NewNote {
  quote: string;
  heading: string;
  line: string;
  anchorIndex: number;
}

/** The notes context value — consumed by every notes UI via `useNotes()`. */
export interface NotesApi {
  /** All notes for the current view, in creation order. */
  notes: Note[];
  /** Note flagged for the panel to scroll-to + ring (e.g. after clicking its
   *  highlight in the doc). Auto-clears. */
  activeId: string | null;
  /** Hit-test a DOM point against every note's highlight; flag the first match
   *  active and return whether one was hit. */
  locateAt(node: Node, offset: number): boolean;
  /** Create a note; returns its id. */
  add(input: NewNote): string;
  /** Replace a note's instruction text. */
  update(id: string, text: string): void;
  /** Delete a note. */
  remove(id: string): void;
  /** Delete all notes. */
  clear(): void;
  /** Scroll a note's highlight into view + flash it. */
  scrollTo(id: string): void;
  /** Plain-text export of all notes (clipboard). */
  buildExport(): string;
  /** Plain-text export of a single note (clipboard). */
  buildOne(id: string): string;
}

/**
 * Host integration for the provider. The notes module is host-agnostic — it
 * takes the active file's identity and raw source via props rather than
 * reaching into any app store, so it can be dropped into any browser host
 * (chrome-ext, website, a VS Code webview, …).
 */
export interface NotesProviderProps {
  /** Identity of the active document. Changing it clears notes (per-view). */
  fileId: string | null;
  /** Display name used in the export header. */
  fileName: string;
  children: ReactNode;
}

/** Props for the in-viewer selection/click layer. */
export interface NotesLayerProps {
  /** Raw markdown of the active file — the source-line text-search fallback. */
  source: string;
  /** Called when a note is added or a highlight is clicked, so the host can
   *  reveal the notes panel. */
  onRequestOpen?: () => void;
}

/** Props for the sidebar panel. */
export interface NotesPanelProps {
  /** Called when the user closes the panel (host owns panel visibility). */
  onClose: () => void;
}
