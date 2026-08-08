// github.css (~.markdown-body styling incl. bundled Mona Sans) is imported
// unconditionally. Its selectors (.fv-github-root / .markdown-body) only match
// when GithubMarkdown is mounted, so there's no leakage into Filemark mode.
import "@filemark/mdx/github.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MDXViewer, GithubMarkdown, frontmatterLineOffset } from "@filemark/mdx";
import {
  ThemeProvider,
  DEFAULT_THEME,
  type ThemeSettings,
  type ViewerProps,
} from "@filemark/core";
import {
  MSG,
  type HostToWebview,
  type PreviewConfig,
  type ViewMode,
} from "../shared/messages";
import { vscode } from "./vscodeApi";
import { webviewStorage } from "./adapters/storage";
import { createWebviewAssetResolver } from "./adapters/assets";
import { createScrollSync, type ScrollSyncController } from "./scrollSync";
import { ZOOM_STEP, clampZoom } from "../shared/constants";

/** Current document + appearance, pushed from the host on open, on every edit,
 *  and whenever the `filemark.*` settings / runtime toggles change. */
interface DocState {
  text: string;
  fileName: string;
  fileExt: string;
  docBaseUri: string;
  config: PreviewConfig;
}

/** Map the VS Code settings payload onto filemark's ThemeSettings. Appearance is
 *  driven entirely by `filemark.*` settings (theme, font, size, width) — no
 *  in-preview controls; the VS Code Settings UI is the picker. */
function toThemeSettings(config: PreviewConfig): ThemeSettings {
  return {
    ...DEFAULT_THEME,
    mode: config.theme,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    lineHeight: config.lineHeight,
    contentWidth: config.contentWidth,
  };
}

export function App() {
  const [doc, setDoc] = useState<DocState | null>(null);
  const scrollSyncRef = useRef<ScrollSyncController | null>(null);
  // Frontmatter line offset for the current doc — added to body-relative source
  // lines (data-*-line attrs) when reporting whole-file lines to the host.
  const lineOffsetRef = useRef(0);

  // One scroll-sync controller for the webview's lifetime: drives the preview
  // when the editor scrolls, reports the preview's own scroll back to the host,
  // and handles double-click jump-to-source.
  useEffect(() => {
    const controller = createScrollSync({
      onScrolled: (line) => vscode.postMessage({ type: MSG.scrolled, line }),
      onRevealSource: (line) =>
        vscode.postMessage({ type: MSG.revealSource, line }),
    });
    scrollSyncRef.current = controller;
    return () => {
      controller.dispose();
      scrollSyncRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data as HostToWebview;
      if (!msg) return;
      if (msg.type === MSG.update) {
        setDoc({
          text: msg.text,
          fileName: msg.fileName,
          fileExt: msg.fileExt,
          docBaseUri: msg.docBaseUri,
          config: msg.config,
        });
        scrollSyncRef.current?.setEnabled(msg.config.scrollSync);
        // data-line anchors are relative to the post-frontmatter body; tell the
        // controller the offset so it maps to/from the host's whole-file lines.
        const offset = frontmatterLineOffset(msg.text);
        lineOffsetRef.current = offset;
        scrollSyncRef.current?.setLineOffset(offset);
      } else if (msg.type === MSG.syncScroll) {
        scrollSyncRef.current?.scrollToLine(msg.line);
      } else if (msg.type === MSG.restoreScroll) {
        scrollSyncRef.current?.restoreToLine(msg.line);
      }
    };
    window.addEventListener("message", onMessage);
    vscode.postMessage({ type: MSG.ready });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Interactive write-back: clicking a task checkbox edits the SOURCE file. We
  // intercept in capture phase and preventDefault so the checkbox doesn't toggle
  // locally — the host applies a WorkspaceEdit, the doc changes, and the live
  // re-render reflects the new marker (file stays the single source of truth).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
        return;
      }
      if (!target.matches("[data-fv-task], .fv-task")) return;
      const li = target.closest("li[data-fv-task-line], [data-line]");
      const raw =
        li?.getAttribute("data-fv-task-line") ?? li?.getAttribute("data-line");
      const bodyLine = Number(raw);
      if (!Number.isFinite(bodyLine)) return;
      e.preventDefault();
      vscode.postMessage({
        type: MSG.toggleTask,
        line: bodyLine + lineOffsetRef.current,
      });
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    vscode.postMessage({ type: MSG.setViewMode, viewMode: mode });
  }, []);

  const zoom = doc?.config.zoom ?? 1;
  const setZoom = useCallback((next: number) => {
    vscode.postMessage({ type: MSG.setZoom, zoom: clampZoom(next) });
  }, []);

  // Keyboard zoom: Cmd/Ctrl +/-/0 (re-bound when the current zoom changes so
  // relative steps read the latest value).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom(zoom + ZOOM_STEP);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom(zoom - ZOOM_STEP);
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, setZoom]);

  const assets = useMemo(
    () => (doc ? createWebviewAssetResolver(doc.docBaseUri) : undefined),
    [doc?.docBaseUri],
  );

  const viewerProps: ViewerProps | null = useMemo(
    () =>
      doc
        ? {
            content: doc.text,
            file: { id: doc.fileName, name: doc.fileName, ext: doc.fileExt },
            storage: webviewStorage,
            assets,
            onNavigate: (href: string) =>
              vscode.postMessage({ type: MSG.navigate, href }),
          }
        : null,
    [doc?.text, doc?.fileName, doc?.fileExt, assets],
  );

  if (!doc || !viewerProps) {
    return <div className="text-muted-foreground p-6 text-sm">Loading…</div>;
  }

  const isGithub = doc.config.viewMode === "github";

  return (
    // Controlled ThemeProvider — the value comes from VS Code settings; there's
    // no in-webview control, so onChange is a no-op.
    <ThemeProvider value={toThemeSettings(doc.config)} onChange={() => undefined}>
      {/* User CSS from the filemark.customCss setting (live via config re-post). */}
      {doc.config.customCss ? <style>{doc.config.customCss}</style> : null}

      <PreviewToolbar
        viewMode={doc.config.viewMode}
        zoom={zoom}
        onSetViewMode={setViewMode}
        onZoomIn={() => setZoom(zoom + ZOOM_STEP)}
        onZoomOut={() => setZoom(zoom - ZOOM_STEP)}
        onZoomReset={() => setZoom(1)}
      />

      {isGithub ? (
        // CSS `zoom` scales everything (getBoundingClientRect stays consistent,
        // so scroll math still lines up). Width var mirrors the chrome-ext.
        <div
          className="pb-16 pt-8"
          style={{
            zoom,
            ["--fv-content-width" as string]: `${doc.config.contentWidth}px`,
          }}
        >
          <GithubMarkdown {...viewerProps} />
        </div>
      ) : (
        // data-toc="closed" hides the MDXViewer's TOC rail in the preview pane.
        <div className="px-6 py-6" data-toc="closed" style={{ zoom }}>
          <MDXViewer {...viewerProps} />
        </div>
      )}
    </ThemeProvider>
  );
}

/** Floating top-right controls: Filemark/GitHub render toggle + zoom. */
function PreviewToolbar({
  viewMode,
  zoom,
  onSetViewMode,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: {
  viewMode: ViewMode;
  zoom: number;
  onSetViewMode: (mode: ViewMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}) {
  const seg =
    "px-2 py-0.5 text-xs rounded transition-colors cursor-pointer";
  const active = "bg-primary text-primary-foreground";
  const inactive = "text-muted-foreground hover:text-foreground";
  const zoomBtn =
    "w-6 h-6 grid place-items-center text-sm rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer";
  return (
    <div className="fixed right-2 top-2 z-50 flex items-center gap-1 rounded-md border bg-popover/90 p-1 shadow-sm backdrop-blur">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          title="Filemark render"
          className={`${seg} ${viewMode === "filemark" ? active : inactive}`}
          onClick={() => onSetViewMode("filemark")}
        >
          Filemark
        </button>
        <button
          type="button"
          title="GitHub render — how it looks pushed to GitHub"
          className={`${seg} ${viewMode === "github" ? active : inactive}`}
          onClick={() => onSetViewMode("github")}
        >
          GitHub
        </button>
      </div>
      <div className="mx-0.5 h-4 w-px bg-border" />
      <div className="flex items-center gap-0.5">
        <button type="button" title="Zoom out (⌘−)" className={zoomBtn} onClick={onZoomOut}>
          −
        </button>
        <button
          type="button"
          title="Reset zoom (⌘0)"
          className="min-w-[3ch] text-center text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={onZoomReset}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" title="Zoom in (⌘+)" className={zoomBtn} onClick={onZoomIn}>
          +
        </button>
      </div>
    </div>
  );
}
