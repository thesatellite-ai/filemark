// github.css (~.markdown-body styling incl. bundled Mona Sans) is imported
// unconditionally. Its selectors (.fv-github-root / .markdown-body) only match
// when GithubMarkdown is mounted, so there's no leakage into Filemark mode.
import "@filemark/mdx/github.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MDXViewer, GithubMarkdown, frontmatterLineOffset } from "@filemark/mdx";
import { CSVViewer } from "@filemark/csv";
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
import {
  ZOOM_STEP,
  clampZoom,
  pickPreviewRenderer,
  type PreviewRenderer,
} from "../shared/constants";

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
    // Matches the boot loader in the initial webview HTML (extension.ts buildHtml)
    // so the spinner is continuous from bundle-load through content-render — no
    // blank flash when React takes over #root. Inline styles + VS Code vars keep
    // it independent of whether app CSS has applied yet.
    return (
      <div className="fv-boot">
        <span className="fv-boot-spin" />
        Loading preview…
      </div>
    );
  }

  // The renderer choice (markdown / github / csv / csv-disabled) is a pure,
  // unit-tested decision — see pickPreviewRenderer. PreviewControls (the
  // rendered/github toggle + zoom) only make sense for markdown; the CSV grid
  // owns its own toolbar, so it's shown for the two markdown-ish renderers only.
  const renderer = pickPreviewRenderer(
    doc.fileExt,
    doc.config.viewMode,
    doc.config.enableCsv,
  );
  const showControls = renderer === "markdown" || renderer === "github";

  return (
    // Controlled ThemeProvider — the value comes from VS Code settings; there's
    // no in-webview control, so onChange is a no-op.
    <ThemeProvider value={toThemeSettings(doc.config)} onChange={() => undefined}>
      {/* User CSS from the filemark.customCss setting (live via config re-post). */}
      {doc.config.customCss ? <style>{doc.config.customCss}</style> : null}

      {showControls ? (
        <PreviewControls
          viewMode={doc.config.viewMode}
          zoom={zoom}
          onSetViewMode={setViewMode}
          onZoomIn={() => setZoom(zoom + ZOOM_STEP)}
          onZoomOut={() => setZoom(zoom - ZOOM_STEP)}
          onZoomReset={() => setZoom(1)}
        />
      ) : null}

      {renderPreviewBody(renderer, viewerProps, zoom, doc.config.contentWidth)}
    </ThemeProvider>
  );
}

/**
 * Render the body for a resolved PreviewRenderer. Kept as a standalone function
 * with an EXHAUSTIVE switch (the `never` default) so adding a PreviewRenderer
 * kind is a compile error here until it's handled — no silent fall-through to a
 * blank pane. `zoom` scales via CSS `zoom` so getBoundingClientRect stays
 * consistent and the scroll-sync math keeps lining up.
 */
function renderPreviewBody(
  renderer: PreviewRenderer,
  viewerProps: ViewerProps,
  zoom: number,
  contentWidth: number,
): ReactNode {
  switch (renderer) {
    case "csv":
      // The CSV grid owns its own chrome (sort/filter/export/fullscreen); it
      // just needs the page padding + shared zoom for parity with other files.
      return (
        <div className="px-6 py-6" style={{ zoom }}>
          <CSVViewer {...viewerProps} />
        </div>
      );
    case "csv-disabled":
      // Reachable only if a preview command runs while filemark.enableCsv is off
      // (the menus are hidden in that case). Be explicit rather than blank.
      return (
        <div className="text-muted-foreground p-8 text-center text-sm">
          CSV preview is disabled. Enable{" "}
          <strong>Filemark › Enable Csv</strong> in Settings to render
          .csv / .tsv files as a data grid.
        </div>
      );
    case "github":
      // No padding here: .fv-github-root owns the page padding AND paints the
      // GitHub canvas full-width, so any wrapper padding would re-expose the host
      // editor bg as a band above/below the canvas (the "two bg" seam).
      return (
        <div
          style={{
            zoom,
            ["--fv-content-width" as string]: `${contentWidth}px`,
          }}
        >
          <GithubMarkdown {...viewerProps} />
        </div>
      );
    case "markdown":
      // data-toc="closed" hides the MDXViewer's TOC rail in the preview pane.
      return (
        <div className="px-6 py-6" data-toc="closed" style={{ zoom }}>
          <MDXViewer {...viewerProps} />
        </div>
      );
    default: {
      // Exhaustiveness guard — if a new PreviewRenderer kind is added without a
      // case above, this line fails to compile (renderer is not assignable to
      // never), forcing the author to handle it.
      const unhandled: never = renderer;
      throw new Error(`Unhandled preview renderer: ${String(unhandled)}`);
    }
  }
}

/**
 * Preview controls as a small floating icon (bottom-right, out of the heading
 * area). It's persistent but subtle — no auto-hide fade. Click it to open a
 * popover with the Filemark/GitHub toggle + zoom; click-outside or Esc closes.
 */
function PreviewControls({
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const seg = "px-2 py-0.5 text-xs rounded transition-colors cursor-pointer";
  const active = "bg-primary text-primary-foreground";
  const inactive = "text-muted-foreground hover:text-foreground";
  const zoomBtn =
    "w-6 h-6 grid place-items-center text-sm rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer";

  return (
    <div
      ref={ref}
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
    >
      {open ? (
        <div className="flex items-center gap-1 rounded-md border bg-popover/95 p-1 shadow-md backdrop-blur">
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
              className="min-w-[3ch] cursor-pointer text-center text-xs text-muted-foreground hover:text-foreground"
              onClick={onZoomReset}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" title="Zoom in (⌘+)" className={zoomBtn} onClick={onZoomIn}>
              +
            </button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Preview options"
        aria-expanded={open}
        title="Preview options — render mode & zoom"
        className={`grid size-9 cursor-pointer place-items-center rounded-full border bg-popover/80 text-muted-foreground shadow-sm backdrop-blur transition hover:bg-popover hover:text-foreground ${
          open ? "opacity-100" : "opacity-60 hover:opacity-100"
        }`}
      >
        {/* sliders-horizontal — represents the view/zoom controls */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <line x1="21" x2="14" y1="4" y2="4" />
          <line x1="10" x2="3" y1="4" y2="4" />
          <line x1="21" x2="12" y1="12" y2="12" />
          <line x1="8" x2="3" y1="12" y2="12" />
          <line x1="21" x2="16" y1="20" y2="20" />
          <line x1="12" x2="3" y1="20" y2="20" />
          <line x1="14" x2="14" y1="2" y2="6" />
          <line x1="8" x2="8" y1="10" y2="14" />
          <line x1="16" x2="16" y1="18" y2="22" />
        </svg>
      </button>
    </div>
  );
}
