// Message protocol between the extension host (extension.ts) and the webview
// (webview/main.tsx). Shared so both ends stay in sync — no bare string literals
// at call sites (see MSG). All host↔webview traffic is postMessage JSON.

/** Message type tags — one closed set, referenced everywhere. */
export const MSG = {
  /** webview → host: the React app has mounted and is ready for content. */
  ready: "fv:ready",
  /** host → webview: (re)render this document. Sent on open + every edit. */
  update: "fv:update",
  /** webview → host: user clicked a link/relative path; host decides how to open. */
  navigate: "fv:navigate",
  /** host → webview: scroll the preview so this 1-based source line is at the top
   *  (mirrors the editor's scroll position). Line may be fractional for smooth
   *  interpolation between stamped block boundaries. */
  syncScroll: "fv:sync-scroll",
  /** webview → host: the preview scrolled; this 1-based source line is now at the
   *  top. Host reveals it in the matching editor. Line may be fractional. */
  scrolled: "fv:scrolled",
  /** webview → host: user double-clicked a preview block; jump the editor to this
   *  1-based source line, move the cursor there, and focus the editor. */
  revealSource: "fv:reveal-source",
  /** host → webview: restore a saved scroll position (1-based source line) when a
   *  preview (re)opens — independent of the scroll-sync setting. */
  restoreScroll: "fv:restore-scroll",
  /** webview → host: user switched Filemark/GitHub render mode via the in-preview
   *  toggle; host persists it (globalState) and re-posts to all previews. */
  setViewMode: "fv:set-view-mode",
  /** webview → host: user changed the zoom level; host persists + re-posts. */
  setZoom: "fv:set-zoom",
  /** webview → host: user clicked a task checkbox; host toggles the `[ ]`↔`[x]`
   *  marker on this 1-based source line via a WorkspaceEdit. */
  toggleTask: "fv:toggle-task",
} as const;

/** Which renderer the preview uses. "filemark" = full component viewer;
 *  "github" = GitHub-flavored approximation (how it looks pushed to GitHub). */
export type ViewMode = "filemark" | "github";

/** Preview appearance, sourced from the `filemark.*` VS Code settings. Maps to
 *  filemark's ThemeSettings so the webview can hand it straight to ThemeProvider. */
export interface PreviewConfig {
  /** Resolved theme mode ("light"/"dark"/"sepia") — the host resolves "auto"
   *  against the VS Code color theme before sending. */
  theme: string;
  fontSize: number;
  lineHeight: number;
  contentWidth: number;
  fontFamily: "sans" | "serif" | "mono";
  /** User CSS injected into the preview (filemark.customCss). Empty = none. */
  customCss: string;
  /** Whether editor↔preview scroll sync is active (filemark.scrollSync). When
   *  off, the webview neither reports its scroll nor reacts to syncScroll. */
  scrollSync: boolean;
  /** Active render mode (runtime toggle, persisted in host globalState). */
  viewMode: ViewMode;
  /** Zoom multiplier for the preview content (1 = 100%). Runtime, persisted. */
  zoom: number;
}

/** host → webview: full render payload. `docBaseUri` is
 *  `webview.asWebviewUri(<document directory>)` — the webview resolves relative
 *  image paths against it (VS Code's secure local-resource mechanism). `config`
 *  carries the current appearance settings (re-sent when they change). */
export interface UpdateMessage {
  type: typeof MSG.update;
  text: string;
  fileName: string;
  fileExt: string;
  docBaseUri: string;
  config: PreviewConfig;
}

/** webview → host */
export interface ReadyMessage {
  type: typeof MSG.ready;
}

/** webview → host */
export interface NavigateMessage {
  type: typeof MSG.navigate;
  href: string;
}

/** host → webview: scroll to a (possibly fractional) 1-based source line. */
export interface SyncScrollMessage {
  type: typeof MSG.syncScroll;
  line: number;
}

/** webview → host: the preview settled with this 1-based source line at the top. */
export interface ScrolledMessage {
  type: typeof MSG.scrolled;
  line: number;
}

/** webview → host: double-click jump to a 1-based source line (+ focus editor). */
export interface RevealSourceMessage {
  type: typeof MSG.revealSource;
  line: number;
}

/** host → webview: restore a saved scroll position (1-based source line). */
export interface RestoreScrollMessage {
  type: typeof MSG.restoreScroll;
  line: number;
}

/** webview → host: switch render mode. */
export interface SetViewModeMessage {
  type: typeof MSG.setViewMode;
  viewMode: ViewMode;
}

/** webview → host: set zoom multiplier (1 = 100%). */
export interface SetZoomMessage {
  type: typeof MSG.setZoom;
  zoom: number;
}

/** webview → host: toggle the task checkbox on a 1-based source line. */
export interface ToggleTaskMessage {
  type: typeof MSG.toggleTask;
  line: number;
}

/** Anything the webview sends to the host. */
export type WebviewToHost =
  | ReadyMessage
  | NavigateMessage
  | ScrolledMessage
  | RevealSourceMessage
  | SetViewModeMessage
  | SetZoomMessage
  | ToggleTaskMessage;
/** Anything the host sends to the webview. */
export type HostToWebview =
  | UpdateMessage
  | SyncScrollMessage
  | RestoreScrollMessage;
