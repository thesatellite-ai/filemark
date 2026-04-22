import { useEffect, useRef, useState } from "react";
import { useLibrary } from "../store";
import { getRenderer } from "../registry";
import { idbStorage } from "../adapters/idbStorage";
import { createFSAAssetResolver } from "../adapters/fsaAssets";
import { sessionHandles } from "../sessionHandles";
import { readFileAsText } from "../fs";
import { MDXViewer } from "@filemark/mdx";
import { WELCOME_DOC } from "../welcomeDoc";
import { AlertCircle } from "lucide-react";
import { RawView } from "./RawView";
import { useSettings } from "../settings";

export function Viewer() {
  const activeId = useLibrary((s) => s.activeFileId);
  const file = useLibrary((s) => (activeId ? s.files[activeId] : null));
  const folder = useLibrary((s) =>
    file?.folderId ? s.folders[file.folderId] : null
  );
  const sessionRev = useLibrary((s) => s.sessionRev);
  const viewMode = useLibrary((s) => s.viewMode);
  const tocOpen = useLibrary((s) => s.tocOpen);
  const autoRefresh = useLibrary((s) => s.autoRefresh);
  const autoRefreshMs = useLibrary((s) => s.autoRefreshMs);
  const jsonSettings = useSettings((s) => s.settings.json);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Keep the latest content in a ref so the poll callback can compare without
  // re-binding the interval on every render.
  const contentRef = useRef<string | null>(null);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Initial / reactive load — runs whenever the active file or the live
  // session rev changes.
  useEffect(() => {
    if (!file) {
      setContent(null);
      setError(null);
      return;
    }
    // Drag-drop-only files cache content directly.
    if (file.content !== undefined && !file.folderId && !file.sourceUrl) {
      setContent(file.content);
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      // Prefer folder handle when available (freshest content from disk).
      if (file.folderId) {
        const handle = sessionHandles.getFile(file.folderId, file.id);
        if (handle) {
          try {
            const text = await readFileAsText(handle);
            if (!cancelled) {
              setContent(text);
              setError(null);
            }
            return;
          } catch (e) {
            if (!cancelled) setError(String((e as Error)?.message ?? e));
            return;
          }
        }
      }

      // Intercept / drag-drop with known file:// URL — fetch the raw file.
      // Extension pages with "Allow access to file URLs" can fetch file://.
      if (file.sourceUrl && file.sourceUrl.startsWith("file://")) {
        try {
          const r = await fetch(file.sourceUrl);
          if (r.ok) {
            const text = await r.text();
            if (!cancelled) {
              setContent(text);
              setError(null);
            }
            return;
          }
        } catch {
          /* fall through */
        }
      }

      // Fallback: cached in-memory content if we already have it.
      if (file.content !== undefined) {
        if (!cancelled) {
          setContent(file.content);
          setError(null);
        }
        return;
      }

      if (!cancelled) {
        setError(
          "Folder access needs to be re-granted. Use the sidebar's “Reconnect folder”."
        );
        setContent(null);
      }
    };

    setLoading(true);
    load().finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // Key by file.id (not the whole file object) so re-activating the same
    // tab — which mutates the files map's object identity for lastOpenedAt —
    // doesn't force a reload and the accompanying "Loading…" flash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id, sessionRev]);

  // Auto-refresh loop. Only runs for files that have a refreshable source
  // (folder handle or file:// sourceUrl). Compares new content to previous
  // to avoid triggering re-renders when nothing has changed on disk.
  useEffect(() => {
    if (!autoRefresh || !file) return;
    const refreshable = fileIsRefreshable(file, sessionHandles);
    if (!refreshable) return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const next = await readLatest(file);
        if (cancelled || next === null) return;
        if (next !== contentRef.current) {
          setContent(next);
        }
      } catch {
        /* swallow — one tick failure shouldn't break the loop */
      }
    };
    const handle = window.setInterval(tick, Math.max(250, autoRefreshMs));
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, autoRefreshMs, file?.id, sessionRev]);

  if (!file) return <WelcomeView />;

  const Renderer = getRenderer(file.ext);
  if (!Renderer) {
    return (
      <StateBlock>
        No renderer registered for <code>.{file.ext}</code>
      </StateBlock>
    );
  }

  if (error) {
    return (
      <StateBlock>
        <AlertCircle className="text-destructive size-4" />
        {error}
      </StateBlock>
    );
  }

  if (loading || content === null) {
    return <StateBlock>Loading…</StateBlock>;
  }

  const dirHandle = folder?.id ? sessionHandles.getDir(folder.id) : null;
  const assets = createFSAAssetResolver(dirHandle, file.path);

  if (viewMode === "raw") {
    return (
      <div className="px-6 pb-16 pt-4">
        <RawView content={content} ext={file.ext} />
      </div>
    );
  }

  const isJson = file.ext === "json" || file.ext === "jsonc";
  const rendererProps = {
    content,
    file: {
      id: file.id,
      name: file.name,
      ext: file.ext,
      path: file.path,
      sourceUrl: file.sourceUrl,
    },
    storage: idbStorage,
    assets,
    ...(isJson ? { options: jsonSettings } : {}),
  };

  // `data-toc` gates the TOC rendered inside `@filemark/mdx`. The package
  // renders the TOC unconditionally; toggling this attribute on the wrapper
  // lets the host show / hide it via CSS without the package needing to know
  // about host-level UI state.
  return (
    <div className="px-6 pb-16 pt-8" data-toc={tocOpen ? "open" : "closed"}>
      <Renderer {...rendererProps} />
    </div>
  );
}

function WelcomeView() {
  const tocOpen = useLibrary((s) => s.tocOpen);
  return (
    <div className="px-6 pb-16 pt-8" data-toc={tocOpen ? "open" : "closed"}>
      <MDXViewer
        content={WELCOME_DOC}
        file={{ id: "__welcome__", name: "welcome.md", ext: "md", path: "welcome.md" }}
        storage={idbStorage}
      />
    </div>
  );
}

function StateBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground flex h-full items-center justify-center gap-2 p-12 text-sm">
      {children}
    </div>
  );
}

/** A file is refreshable if we can read its current on-disk content from
 *  here — either through a live FSA handle or a file:// URL. */
export function fileIsRefreshable(
  file: { folderId?: string | null; id: string; sourceUrl?: string },
  handles: { getFile: (folderId: string, fileId: string) => unknown }
): boolean {
  if (file.folderId && handles.getFile(file.folderId, file.id)) return true;
  if (file.sourceUrl && file.sourceUrl.startsWith("file://")) return true;
  return false;
}

async function readLatest(file: {
  folderId?: string | null;
  id: string;
  sourceUrl?: string;
}): Promise<string | null> {
  if (file.folderId) {
    const handle = sessionHandles.getFile(file.folderId, file.id);
    if (handle) return await readFileAsText(handle);
  }
  if (file.sourceUrl && file.sourceUrl.startsWith("file://")) {
    const r = await fetch(file.sourceUrl);
    if (r.ok) return await r.text();
  }
  return null;
}
