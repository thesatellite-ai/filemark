// AI REVIEW NOTES — public API.
//
// Self-contained, host-agnostic module: highlight text in a rendered markdown
// doc, attach AI-review notes, copy them out. It depends only on React + the
// DOM (no app store, no chrome.*), so a host wires it via props:
//
//   <NotesProvider fileId={id} fileName={name}>
//     …viewer…
//     <NotesLayer source={rawMarkdown} onRequestOpen={openPanel} />
//     {panelOpen && <NotesPanel onClose={closePanel} />}
//   </NotesProvider>
//
// The host also needs the two highlight CSS rules (see app/styles/index.css):
//   ::highlight(fv-note) { … }   ::highlight(fv-note-active) { … }
//
// Architecture + build history: docsi/NOTES_FEATURE.md.
export { NotesProvider, useNotes } from "./NotesContext";
export { NotesLayer } from "./NotesLayer";
export { NotesPanel } from "./NotesPanel";
export {
  HIGHLIGHT_NAME,
  ACTIVE_HIGHLIGHT_NAME,
  BODY_SELECTOR,
} from "./constants";
export type {
  Note,
  NotesApi,
  NotesProviderProps,
  NotesLayerProps,
  NotesPanelProps,
} from "./types";
