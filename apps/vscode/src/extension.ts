// Filemark VS Code extension — host side.
//
// Model (see docsi/VSCODE_EXTENSION_PLAN.md, ADR VSC-1): raw editing stays the
// native text editor; this adds a filemark PREVIEW as a WebviewPanel that opens
// in the active column (so it sits beside the editor tab, toggle by clicking
// tabs), renders the same @filemark/mdx viewer as the Chrome ext + website, and
// live-updates as the document changes.

import * as path from "node:path";
import * as crypto from "node:crypto";
import { execFile } from "node:child_process";
import * as vscode from "vscode";
import {
  MSG,
  type WebviewToHost,
  type PreviewConfig,
  type ViewMode,
} from "./shared/messages";
import { DEFAULT_ZOOM, ZOOM_STEP, clampZoom } from "./shared/constants";

// Help-link fallbacks — used only if package.json somehow lacks these fields
// (they're normally read from context.extension.packageJSON so the URLs live in
// one place). Kept in sync with package.json `homepage` / `bugs.url`.
const HOMEPAGE_URL_FALLBACK = "https://khanakia.com/apps/filemark/";
const ISSUES_URL_FALLBACK = "https://github.com/thesatellite-ai/filemark/issues";
import { toggleTaskMarker } from "./features/taskToggle";
import { registerSymbols } from "./features/symbols";
import { registerFolding } from "./features/folding";
import { registerLinks } from "./features/links";
import { registerStatusBar } from "./features/statusBar";
import { registerTaskTree } from "./features/taskTree";

const MARKDOWN_LANGUAGE_ID = "markdown";
const CONFIG_SECTION = "filemark";
const AUTO_OPEN_KEY = "autoOpenPreview";
const SCROLL_SYNC_KEY = "scrollSync";
/** How long (ms) to ignore an editor's visible-range change after WE moved it
 *  (from a preview scroll), so the reveal doesn't echo back to the preview. */
const EDITOR_SYNC_SUPPRESS_MS = 200;

// Runtime UI state — toggled in the preview, not via settings, so it lives in
// globalState (persists across sessions, shared by all previews).
const VIEW_MODE_KEY = "runtime.viewMode";
const ZOOM_KEY = "runtime.zoom";
const DEFAULT_VIEW_MODE: ViewMode = "filemark";
/** Per-document saved scroll line, keyed `scroll:<uri>` in globalState. */
const SCROLL_MEMORY_PREFIX = "scroll:";
/** How long (ms) transient status-bar confirmations (e.g. scroll-sync toggle)
 *  stay visible before auto-clearing. */
const STATUS_MESSAGE_MS = 2000;
/** Debounce (ms) for persisting scroll position as the user scrolls. */
const SCROLL_PERSIST_DEBOUNCE_MS = 400;
/** Debounce (ms) for live preview re-render while typing — one re-parse +
 *  re-highlight per pause, not per keystroke. */
const LIVE_UPDATE_DEBOUNCE_MS = 120;

/** Set in activate(); lets helpers reach globalState for runtime UI state. */
let extContext: vscode.ExtensionContext | undefined;

/** Resolve `filemark.theme` — mapping "auto" onto the active VS Code color
 *  theme (light/dark, high-contrast → dark/light) — to a concrete filemark mode. */
function resolveTheme(configured: string): string {
  if (configured !== "auto") return configured;
  switch (vscode.window.activeColorTheme.kind) {
    case vscode.ColorThemeKind.Light:
    case vscode.ColorThemeKind.HighContrastLight:
      return "light";
    default:
      return "dark";
  }
}

/** Read the `filemark.*` appearance settings into a PreviewConfig. Defaults
 *  mirror the manifest's `contributes.configuration` defaults. */
function readConfig(): PreviewConfig {
  const c = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    theme: resolveTheme(c.get<string>("theme", "light")),
    fontFamily: c.get<PreviewConfig["fontFamily"]>("fontFamily", "sans"),
    fontSize: c.get<number>("fontSize", 14),
    lineHeight: c.get<number>("lineHeight", 1.65),
    contentWidth: c.get<number>("contentWidth", 760),
    customCss: c.get<string>("customCss", ""),
    scrollSync: c.get<boolean>(SCROLL_SYNC_KEY, true),
    viewMode: getViewMode(),
    zoom: getZoom(),
  };
}

function scrollSyncEnabled(): boolean {
  return vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .get<boolean>(SCROLL_SYNC_KEY, true);
}

function getViewMode(): ViewMode {
  return (
    extContext?.globalState.get<ViewMode>(VIEW_MODE_KEY) ?? DEFAULT_VIEW_MODE
  );
}

function getZoom(): number {
  // Clamp defensively — a stale/garbage stored value must never break layout.
  return clampZoom(extContext?.globalState.get<number>(ZOOM_KEY) ?? DEFAULT_ZOOM);
}

/** One preview panel per document URI. */
const panels = new Map<string, vscode.WebviewPanel>();

/** Pending debounced live-update re-renders, keyed by document URI. */
const liveUpdateTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Documents whose preview the user closed by hand. Auto-open skips these so
 * closing the preview doesn't instantly reopen (focus returns to the editor,
 * which would otherwise re-trigger auto-open — the "keeps reopening" loop).
 * Cleared when the file itself is closed, or when the user explicitly reopens
 * the preview via the command.
 */
const dismissed = new Set<string>();

/**
 * Document URIs whose editor we just moved in response to a preview scroll.
 * The resulting visible-range change must NOT be echoed back to the preview,
 * or the two would fight. Entries auto-clear after EDITOR_SYNC_SUPPRESS_MS.
 */
const suppressEditorSync = new Set<string>();

export function activate(context: vscode.ExtensionContext): void {
  extContext = context;

  // Command + editor-title button + keybinding all route here.
  context.subscriptions.push(
    vscode.commands.registerCommand("filemark.openPreview", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        openPreview(context, editor.document, {
          focus: true,
          column: vscode.ViewColumn.Active,
        });
      }
    }),
  );

  // Same as openPreview, but opens the preview in the column BESIDE the editor
  // (a split), so raw + preview are visible at once — where scroll sync shines.
  context.subscriptions.push(
    vscode.commands.registerCommand("filemark.openPreviewToSide", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        openPreview(context, editor.document, {
          focus: true,
          column: vscode.ViewColumn.Beside,
        });
      }
    }),
  );

  // Open the current file as file://… in Chrome, where the filemark Chrome
  // extension renders it. Markdown files on disk only (guarded in the menu).
  context.subscriptions.push(
    vscode.commands.registerCommand("filemark.openInBrowser", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.uri.scheme === "file") {
        openInBrowser(editor.document.uri);
      }
    }),
  );

  // Open the Settings UI scoped to just this extension's `filemark.*` settings.
  // We use context.extension.id (not a hard-coded id) because the Marketplace
  // build ships under a different name than the Open VSX build (khanakia.filemark
  // vs khanakia.khanakia-filemark — see PUBLISHING.md), so the `@ext:` filter has
  // to be derived at runtime to match whichever id is actually installed.
  context.subscriptions.push(
    vscode.commands.registerCommand("filemark.openSettings", () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        `@ext:${context.extension.id}`,
      );
    }),
  );

  // Zoom commands — drive the SAME runtime zoom the in-preview FAB uses. Zoom is
  // stored in globalState (getZoom/ZOOM_KEY) and read by readConfig(); updating it
  // + repostAll() re-sends config to every preview, which re-applies the CSS zoom.
  // Mirrors the webview's own Cmd/Ctrl +/-/0 keybindings so both entry points stay
  // consistent. Bindings are contributed in package.json, scoped to the preview.
  const applyZoom = (next: number): void => {
    void context.globalState.update(ZOOM_KEY, clampZoom(next)).then(repostAll);
  };
  context.subscriptions.push(
    vscode.commands.registerCommand("filemark.zoomIn", () =>
      applyZoom(getZoom() + ZOOM_STEP),
    ),
    vscode.commands.registerCommand("filemark.zoomOut", () =>
      applyZoom(getZoom() - ZOOM_STEP),
    ),
    vscode.commands.registerCommand("filemark.zoomReset", () =>
      applyZoom(DEFAULT_ZOOM),
    ),
  );

  // Toggle editor↔preview scroll sync by flipping the `filemark.scrollSync`
  // setting. The onDidChangeConfiguration listener below re-posts to all previews,
  // so we don't repost here. Written to the Global target (a user-wide preference,
  // not per-workspace). A toast confirms the new state since there's no visible UI.
  context.subscriptions.push(
    vscode.commands.registerCommand("filemark.toggleScrollSync", () => {
      const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
      const next = !cfg.get<boolean>("scrollSync", true);
      void cfg
        .update("scrollSync", next, vscode.ConfigurationTarget.Global)
        .then(() =>
          vscode.window.setStatusBarMessage(
            `Filemark: scroll sync ${next ? "on" : "off"}`,
            STATUS_MESSAGE_MS,
          ),
        );
    }),
  );

  // Reload — force a full re-render (re-parse + re-highlight) of every open
  // preview with the current file contents. Handy after an external file change
  // or if a preview looks stale. Reuses repostAll (same path as a settings change).
  context.subscriptions.push(
    vscode.commands.registerCommand("filemark.reloadPreview", () => repostAll()),
  );

  // Help links — open the docs / issue tracker in the default browser. URLs come
  // from package.json (homepage / bugs.url) so they live in one place, with the
  // constants above as a defensive fallback.
  const pkg = context.extension.packageJSON as {
    homepage?: string;
    bugs?: { url?: string };
  };
  context.subscriptions.push(
    vscode.commands.registerCommand("filemark.openDocs", () => {
      void vscode.env.openExternal(
        vscode.Uri.parse(pkg.homepage ?? HOMEPAGE_URL_FALLBACK),
      );
    }),
    vscode.commands.registerCommand("filemark.reportIssue", () => {
      void vscode.env.openExternal(
        vscode.Uri.parse(pkg.bugs?.url ?? ISSUES_URL_FALLBACK),
      );
    }),
  );

  // Auto-open: when a Markdown editor becomes active and no preview exists yet
  // for it, open one. Guarding on "no existing panel" is what lets the user
  // click back to the editor tab (raw) without the preview re-stealing focus.
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor || editor.document.languageId !== MARKDOWN_LANGUAGE_ID) return;
      if (!autoOpenEnabled()) return;
      const key = editor.document.uri.toString();
      if (panels.has(key) || dismissed.has(key)) return;
      openPreview(context, editor.document, {
        focus: true,
        column: vscode.ViewColumn.Active,
      });
    }),
  );

  // Live update: re-render the matching preview on edit, debounced so a burst of
  // keystrokes triggers ONE re-parse+re-highlight (which is the expensive part)
  // after the user pauses, not one per character.
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      const key = e.document.uri.toString();
      if (!panels.has(key)) return;
      const existing = liveUpdateTimers.get(key);
      if (existing) clearTimeout(existing);
      liveUpdateTimers.set(
        key,
        setTimeout(() => {
          liveUpdateTimers.delete(key);
          const panel = panels.get(key);
          const doc = vscode.workspace.textDocuments.find(
            (d) => d.uri.toString() === key,
          );
          if (panel && doc) postUpdate(panel, doc);
        }, LIVE_UPDATE_DEBOUNCE_MS),
      );
    }),
  );

  // Editor → preview scroll sync: when an editor with an open preview scrolls,
  // tell the preview which source line is at the top. Suppressed for ranges we
  // moved ourselves (from a preview scroll) to avoid a feedback loop.
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
      if (!scrollSyncEnabled()) return;
      const key = e.textEditor.document.uri.toString();
      if (suppressEditorSync.has(key)) return;
      const panel = panels.get(key);
      if (!panel || e.visibleRanges.length === 0) return;
      // +1: source lines are 1-based (matching remarkSourceLine's data-line).
      const topLine = e.visibleRanges[0].start.line + 1;
      void panel.webview.postMessage({ type: MSG.syncScroll, line: topLine });
    }),
  );

  // Closing the raw file closes its preview and clears any dismissal, so
  // reopening the file starts fresh (auto-open can fire again).
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      const key = doc.uri.toString();
      dismissed.delete(key);
      panels.get(key)?.dispose();
    }),
  );

  // Re-render every open preview when the appearance settings — or, for the
  // "auto" theme, the VS Code color theme — change.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(CONFIG_SECTION)) repostAll();
    }),
    vscode.window.onDidChangeActiveColorTheme(() => repostAll()),
  );

  // Toggle Filemark ⇄ GitHub render mode across all previews.
  context.subscriptions.push(
    vscode.commands.registerCommand("filemark.toggleGithubPreview", () => {
      const next: ViewMode = getViewMode() === "github" ? "filemark" : "github";
      void context.globalState.update(VIEW_MODE_KEY, next).then(repostAll);
    }),
  );

  // Language features on the raw Markdown editor (outline/breadcrumbs, folding,
  // wikilinks) + the status bar (reading time / words / tasks).
  registerSymbols(context);
  registerFolding(context);
  registerLinks(context);
  registerStatusBar(context);
  // Activity-bar tree of every task across the workspace's Markdown files.
  registerTaskTree(context);

  // Handle the editor already open when the extension activates.
  const active = vscode.window.activeTextEditor;
  if (
    active &&
    active.document.languageId === MARKDOWN_LANGUAGE_ID &&
    autoOpenEnabled()
  ) {
    openPreview(context, active.document, {
      focus: false,
      column: vscode.ViewColumn.Active,
    });
  }
}

export function deactivate(): void {
  for (const panel of panels.values()) panel.dispose();
  panels.clear();
}

function autoOpenEnabled(): boolean {
  return vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .get<boolean>(AUTO_OPEN_KEY, true);
}

/** How a preview should be placed when opened. */
interface OpenPreviewOptions {
  /** Take focus (true) or leave it on the editor (false). */
  focus: boolean;
  /** Target column — Active = same pane (tab), Beside = split to the side. */
  column: vscode.ViewColumn;
}

function openPreview(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  { focus, column }: OpenPreviewOptions,
): void {
  const key = document.uri.toString();
  // Opening (explicitly or via auto-open) means it's no longer "dismissed".
  dismissed.delete(key);
  const existing = panels.get(key);
  if (existing) {
    // Reveal in the REQUESTED column, not wherever it currently sits — otherwise
    // "Open Preview to the Side" (column = Beside) is a no-op whenever a preview
    // already exists (auto-open, or a prior Open Preview), because it would just
    // re-reveal the panel in place. Passing `column` moves the existing panel to
    // the side (or back to the active column for plain Open Preview), matching
    // VS Code's built-in showPreview / showPreviewToSide behaviour.
    existing.reveal(column, !focus);
    return;
  }

  const docDir = vscode.Uri.file(path.dirname(document.uri.fsPath));
  const panel = vscode.window.createWebviewPanel(
    "filemark.preview",
    `Preview ${path.basename(document.uri.fsPath)}`,
    { viewColumn: column, preserveFocus: !focus },
    {
      enableScripts: true,
      // Cmd/Ctrl+F searches the rendered preview (webviews have no find widget
      // unless opted in).
      enableFindWidget: true,
      retainContextWhenHidden: true,
      // The webview may load its bundle (dist/) + the document's own images.
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, "dist"),
        docDir,
        ...(vscode.workspace.workspaceFolders?.map((f) => f.uri) ?? []),
      ],
    },
  );

  // Stamp the resolved theme into the initial HTML so the first paint matches —
  // no light→dark flash while the bundle boots.
  panel.webview.html = buildHtml(
    panel.webview,
    context.extensionUri,
    readConfig().theme,
  );

  panel.webview.onDidReceiveMessage((raw: WebviewToHost) => {
    if (raw.type === MSG.ready) {
      postUpdate(panel, document);
      // Restore the reader's last position for this file, if we have one.
      const saved = savedScrollLine(key);
      if (saved != null) {
        void panel.webview.postMessage({ type: MSG.restoreScroll, line: saved });
      }
    } else if (raw.type === MSG.navigate) {
      void handleNavigate(raw.href, docDir);
    } else if (raw.type === MSG.scrolled) {
      // Always remember (scroll memory is independent of sync); only mirror the
      // editor when scroll sync is enabled.
      rememberScroll(key, raw.line);
      if (scrollSyncEnabled()) revealEditorLine(document.uri, raw.line);
    } else if (raw.type === MSG.revealSource) {
      void revealSourceLine(document, raw.line);
    } else if (raw.type === MSG.setViewMode) {
      void context.globalState.update(VIEW_MODE_KEY, raw.viewMode).then(repostAll);
    } else if (raw.type === MSG.setZoom) {
      void context.globalState.update(ZOOM_KEY, clampZoom(raw.zoom)).then(repostAll);
    } else if (raw.type === MSG.toggleTask) {
      void toggleTaskLine(document, raw.line);
    }
  });

  panel.onDidDispose(() => {
    panels.delete(key);
    // Persist the last scroll position now, so reopening restores it even if the
    // debounce hadn't fired yet.
    flushScroll(key);
    // If the user closed just the preview (the file is still open), remember it
    // so auto-open doesn't immediately reopen. If the file itself was closed,
    // it's already gone from textDocuments — leave dismissed clear.
    const fileStillOpen = vscode.workspace.textDocuments.some(
      (d) => d.uri.toString() === key,
    );
    if (fileStillOpen) dismissed.add(key);
  });
  panels.set(key, panel);
}

/** Re-post the current text + config to every open preview (settings/theme/
 *  view-mode/zoom changed). */
function repostAll(): void {
  for (const [key, panel] of panels) {
    const doc = vscode.workspace.textDocuments.find(
      (d) => d.uri.toString() === key,
    );
    if (doc) postUpdate(panel, doc);
  }
}

// Scroll memory: last top source line per document URI, persisted in globalState
// so a reopened preview restores where the reader was. Writes are debounced —
// scrolling fires many events, but we only need the resting position. The latest
// value is held in `pendingScroll` so it can be flushed immediately when the
// preview is closed (otherwise a fast close→reopen would read a stale value
// before the debounce fires).
const scrollPersistTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingScroll = new Map<string, number>();

function writeScroll(uri: string): void {
  const line = pendingScroll.get(uri);
  if (line == null) return;
  pendingScroll.delete(uri);
  const timer = scrollPersistTimers.get(uri);
  if (timer) {
    clearTimeout(timer);
    scrollPersistTimers.delete(uri);
  }
  void extContext?.globalState.update(SCROLL_MEMORY_PREFIX + uri, line);
}

function rememberScroll(uri: string, line: number): void {
  pendingScroll.set(uri, Math.round(line));
  const existing = scrollPersistTimers.get(uri);
  if (existing) clearTimeout(existing);
  scrollPersistTimers.set(
    uri,
    setTimeout(() => writeScroll(uri), SCROLL_PERSIST_DEBOUNCE_MS),
  );
}

/** Persist any pending scroll position for a document right now (on close). */
function flushScroll(uri: string): void {
  writeScroll(uri);
}

function savedScrollLine(uri: string): number | undefined {
  return extContext?.globalState.get<number>(SCROLL_MEMORY_PREFIX + uri);
}

/** Send the current document text + a webview base URI for relative images. */
function postUpdate(
  panel: vscode.WebviewPanel,
  document: vscode.TextDocument,
): void {
  const docDir = vscode.Uri.file(path.dirname(document.uri.fsPath));
  void panel.webview.postMessage({
    type: MSG.update,
    text: document.getText(),
    fileName: path.basename(document.uri.fsPath),
    fileExt: path.extname(document.uri.fsPath).replace(/^\./, "").toLowerCase(),
    docBaseUri: panel.webview.asWebviewUri(docDir).toString(),
    config: readConfig(),
  });
}

/**
 * Preview → editor scroll sync: reveal the given (1-based, possibly fractional)
 * source line at the top of the matching visible editor. We suppress the
 * editor's own visible-range event for a short window so the reveal doesn't
 * bounce back to the preview.
 */
function revealEditorLine(uri: vscode.Uri, line: number): void {
  if (!scrollSyncEnabled()) return;
  const key = uri.toString();
  const editor = vscode.window.visibleTextEditors.find(
    (e) => e.document.uri.toString() === key,
  );
  if (!editor) return;
  // data-line is 1-based; editor lines are 0-based. Clamp into range.
  const zeroBased = Math.max(0, Math.round(line) - 1);
  const target = Math.min(zeroBased, editor.document.lineCount - 1);
  suppressEditorSync.add(key);
  editor.revealRange(
    new vscode.Range(target, 0, target, 0),
    vscode.TextEditorRevealType.AtTop,
  );
  setTimeout(() => suppressEditorSync.delete(key), EDITOR_SYNC_SUPPRESS_MS);
}

/**
 * Double-click jump: open/focus the editor for `document`, move the cursor to
 * the given (1-based) source line, and scroll it into view. Unlike the passive
 * scroll sync, this takes focus. Suppresses the resulting visible-range echo.
 */
async function revealSourceLine(
  document: vscode.TextDocument,
  line: number,
): Promise<void> {
  const key = document.uri.toString();
  const target = Math.min(
    Math.max(0, Math.round(line) - 1),
    document.lineCount - 1,
  );
  const cursor = new vscode.Range(target, 0, target, 0);
  // Reuse the column the file is already shown in, if any.
  const existing = vscode.window.visibleTextEditors.find(
    (e) => e.document.uri.toString() === key,
  );
  suppressEditorSync.add(key);
  await vscode.window.showTextDocument(document, {
    viewColumn: existing?.viewColumn,
    preserveFocus: false,
    selection: cursor,
  });
  setTimeout(() => suppressEditorSync.delete(key), EDITOR_SYNC_SUPPRESS_MS);
}

/**
 * Interactive write-back: toggle the task checkbox on `line` (1-based) in the
 * document's source via a WorkspaceEdit. The pure decision (is it a task? which
 * column, which char) lives in {@link toggleTaskMarker}; here we only apply it.
 * No-op if the line is out of range or not a task bullet (safe preview click).
 */
async function toggleTaskLine(
  document: vscode.TextDocument,
  line: number,
): Promise<void> {
  const idx = line - 1;
  if (idx < 0 || idx >= document.lineCount) return;
  const toggle = toggleTaskMarker(document.lineAt(idx).text);
  if (!toggle) return;
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(idx, toggle.col, idx, toggle.col + 1),
    toggle.next,
  );
  await vscode.workspace.applyEdit(edit);
}

/**
 * Open a file as `file://…` in Chrome, where the filemark Chrome extension
 * renders it. `vscode.env.openExternal` on a file: URI opens the OS default app
 * (usually a text editor for .md), NOT the browser — so we launch Chrome
 * directly per platform, falling back to the default browser/handler if Chrome
 * isn't found. `execFile` (arg array, no shell) avoids injection from the path.
 */
function openInBrowser(uri: vscode.Uri): void {
  const url = uri.toString(); // file:///abs/path.md — URL-encoded by VS Code
  const attempts: ReadonlyArray<readonly [string, string[]]> =
    process.platform === "darwin"
      ? [
          ["open", ["-a", "Google Chrome", url]],
          ["open", [url]],
        ]
      : process.platform === "win32"
        ? [
            ["cmd", ["/c", "start", "", "chrome", url]],
            ["cmd", ["/c", "start", "", url]],
          ]
        : [
            ["google-chrome", [url]],
            ["xdg-open", [url]],
          ];
  tryLaunch(attempts, 0);
}

/** Try each launcher in order; report only if all fail. */
function tryLaunch(
  attempts: ReadonlyArray<readonly [string, string[]]>,
  index: number,
): void {
  if (index >= attempts.length) {
    void vscode.window.showErrorMessage(
      "Filemark: couldn't open the file in a browser. Is Chrome installed?",
    );
    return;
  }
  const [command, args] = attempts[index];
  execFile(command, args, (error) => {
    if (error) tryLaunch(attempts, index + 1);
  });
}

/** Open links / relative file references from the preview. */
async function handleNavigate(
  href: string,
  docDir: vscode.Uri,
): Promise<void> {
  if (/^https?:\/\//i.test(href)) {
    await vscode.env.openExternal(vscode.Uri.parse(href));
    return;
  }
  if (href.startsWith("#")) return; // in-doc anchor — nothing to open
  const target = vscode.Uri.file(path.resolve(docDir.fsPath, href));
  try {
    await vscode.window.showTextDocument(target);
  } catch {
    /* not a file we can open — ignore */
  }
}

/** Themes the webview stylesheet defines tokens for; anything else → dark. */
const KNOWN_THEMES = new Set(["light", "dark", "sepia"]);

/**
 * Webview HTML: loads the single built bundle (dist/webview/main.{js,css}) via
 * asWebviewUri, with a strict CSP + nonce. filemark is already eval-free (from
 * the MV3 work), so a nonce'd script + inline styles (for shiki/mermaid) is all
 * that's needed.
 *
 * The resolved theme is stamped on <html data-theme> in the INITIAL markup so
 * the very first paint uses the right tokens — otherwise main.css paints the
 * light default, then React's ThemeProvider stamps data-theme on mount and the
 * page jumps light→dark (the "flash" while the 10MB bundle parses). A pre-paint
 * background (VS Code's own editor bg) covers the sliver before main.css loads.
 */
function buildHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  theme: string,
): string {
  const asset = (...p: string[]) =>
    webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "dist", "webview", ...p),
    );
  const jsUri = asset("main.js");
  const cssUri = asset("main.css");
  const safeTheme = KNOWN_THEMES.has(theme) ? theme : "dark";
  const nonce = crypto.randomBytes(16).toString("base64");
  const csp = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} https: data: blob:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `font-src ${webview.cspSource} data:`,
    // 'strict-dynamic' lets the nonce'd entry module pull in its lazily
    // code-split chunks (mermaid, shiki langs, katex, markmap) which aren't
    // themselves nonce-tagged. Without it a strict script-src blocks them.
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en" data-theme="${safeTheme}">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
html,body{margin:0;background:var(--vscode-editor-background);color:var(--vscode-editor-foreground);}
/* Boot loader shown until the JS bundle parses + React mounts (the bundle is
 * large, so #root would otherwise sit blank with no signal). Styled only with
 * VS Code theme vars + inline CSS so it needs neither main.css nor React. React
 * replaces #root on mount; App's pending state renders a matching loader, so the
 * spinner is continuous until the document actually renders. */
.fv-boot{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;gap:10px;
  color:var(--vscode-descriptionForeground,#8a8a8a);
  font:13px/1.4 var(--vscode-font-family,-apple-system,system-ui,sans-serif);}
.fv-boot-spin{width:15px;height:15px;border:2px solid currentColor;border-top-color:transparent;
  border-radius:50%;display:inline-block;animation:fv-spin .7s linear infinite;}
@keyframes fv-spin{to{transform:rotate(360deg)}}
</style>
<link rel="stylesheet" href="${cssUri}" />
</head>
<body>
<div id="root"><div class="fv-boot"><span class="fv-boot-spin"></span>Loading preview…</div></div>
<script type="module" nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
}
