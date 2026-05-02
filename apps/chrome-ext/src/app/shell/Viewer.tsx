import { useEffect, useMemo, useRef, useState } from "react";
import { useLibrary } from "../store";
import { useTaskIndex } from "../taskIndex";
import { useLinkIndex } from "../linkIndex";
import { getRenderer } from "../registry";
import { idbStorage } from "../adapters/idbStorage";
import { createFSAAssetResolver } from "../adapters/fsaAssets";
import { sessionHandles } from "../sessionHandles";
import { readFileAsText } from "../fs";
import { MDXViewer, BacklinksProvider, type Backlink } from "@filemark/mdx";
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
  const scrollTarget = useLibrary((s) => s.scrollTarget);
  const jsonSettings = useSettings((s) => s.settings.json);
  const indexFile = useTaskIndex((s) => s.indexFile);
  const indexLinkFile = useLinkIndex((s) => s.indexFile);
  const linkIndex = useLinkIndex((s) => s.index);
  const backlinksFor = useLinkIndex((s) => s.backlinksFor);
  const setActive = useLibrary((s) => s.setActive);
  const [content, setContent] = useState<string | null>(null);
  // Tracks which file the current `content` state is actually for.
  // Needed because file switches keep the previous file's `content`
  // mounted until async load completes (to avoid a "Loading…" flash).
  // Without this, the scroll-to-line effect can't tell whether the DOM
  // it's querying is the target file or the previous one. Updated
  // whenever setContent() is called with new bytes.
  const [contentFileId, setContentFileId] = useState<string | null>(null);
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
      setContentFileId(null);
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
              setContentFileId(file.id);
              setError(null);
            }
            return;
          } catch (e) {
            if (!cancelled) setError(String((e as Error)?.message ?? e));
            return;
          }
        }
      }

      // Loose single-file drop with a live handle (set at drop time + after
      // hydrate's silent restore) — re-read from disk every load so saves
      // outside Filemark are picked up after a page reload.
      if (!file.folderId) {
        const looseHandle = sessionHandles.getLoose(file.id);
        if (looseHandle) {
          try {
            const text = await readFileAsText(looseHandle);
            if (!cancelled) {
              setContent(text);
              setContentFileId(file.id);
              setError(null);
            }
            return;
          } catch {
            /* fall through to other intake paths */
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
              setContentFileId(file.id);
              setError(null);
            }
            return;
          }
        } catch {
          /* fall through */
        }
      }

      // Fallback: cached in-memory content if we already have it.
      // (Drop files with no handle land here — frozen at drop time.)
      if (file.content !== undefined) {
        if (!cancelled) {
          setContent(file.content);
          setContentFileId(file.id);
          setError(null);
        }
        return;
      }

      if (!cancelled) {
        setError(
          "Folder access needs to be re-granted. Use the sidebar's “Reconnect folder”."
        );
        setContent(null);
        setContentFileId(null);
      }
    };

    // Only flash the "Loading…" placeholder on a **genuine first load**
    // (no content yet). A re-load triggered by sessionRev bump (e.g.
    // session handles re-registered, folder rescan) keeps the existing
    // content mounted — load() will swap content silently via setContent
    // only if the new bytes differ, preserving scroll position + avoiding
    // flicker. This is the single biggest UX win for auto-refresh:
    // previously every tick showed the loading screen briefly and
    // unmounted the MDX body, scrolling the page to the top.
    if (content === null) setLoading(true);
    load().finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // Key by file.id (not the whole file object) so re-activating the same
    // tab — which mutates the files map's object identity for lastOpenedAt —
    // doesn't force a reload and the accompanying "Loading…" flash. The
    // `content` dep is intentionally omitted: we read it inside the effect
    // (`content === null ? setLoading(true)`) but don't want an infinite
    // loop re-running whenever content changes.
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
          setContentFileId(file.id);
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

  // Re-read the active file whenever the user tabs back to Filemark.
  // Independent of the autoRefresh setting (no polling overhead while
  // idle, but always fresh on focus). Common workflow: edit doc in
  // VS Code -> save -> ⌘-tab back to Filemark -> see the change without
  // having to drop the file again.
  useEffect(() => {
    if (!file) return;
    if (!fileIsRefreshable(file, sessionHandles)) return;

    let cancelled = false;
    const reread = async () => {
      try {
        const next = await readLatest(file);
        if (cancelled || next === null) return;
        if (next !== contentRef.current) {
          setContent(next);
          setContentFileId(file.id);
        }
      } catch {
        /* swallow — focus-driven re-read failures shouldn't surface */
      }
    };

    const onFocus = () => void reread();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void reread();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id]);

  // Feed the cross-file task index every time content changes for this
  // file. The index dedupes by content hash so repeated calls with the
  // same bytes are cheap no-ops. Only runs for markdown-ish files —
  // parsing JSON / schema files as "tasks" would produce nothing anyway
  // but we guard explicitly to avoid pointless hash work at scale.
  useEffect(() => {
    if (!file || content == null) return;
    const ext = file.ext.toLowerCase();
    if (ext !== "md" && ext !== "mdx" && ext !== "markdown") return;
    indexFile(file.id, content, file.name, file.path);
    indexLinkFile(file.id, content, file.name, file.path);
  }, [file, content, indexFile, indexLinkFile]);

  // Compute inbound backlinks for the active file. Recomputes when the
  // link index changes (any opened file's links update). The provider
  // wraps MDXViewer so any <Backlinks /> element in the doc renders the
  // up-to-date list. onOpen jumps to the source file.
  const backlinksValue = useMemo(() => {
    if (!file)
      return { links: [] as Backlink[], onOpen: undefined as undefined };
    const links = backlinksFor(file.id, file.name);
    return {
      links,
      onOpen: (fromFileId: string) => {
        void setActive(fromFileId);
      },
    };
    // linkIndex referenced so memo invalidates when it mutates.
  }, [file, backlinksFor, linkIndex, setActive]);

  // Scroll-to-line handler. When TaskPanel clicks a row,
  // library.openTaskLocation() bumps `scrollTarget`. If the target is
  // in the currently-displayed file, find the <li data-fv-task-line=N>
  // and scroll it into view + add a transient highlight class.
  //
  // Three real-world complications this guards against:
  //
  //   1. Cross-file clicks. The panel may point at a task in a file
  //      DIFFERENT from the active one. setActive runs instantly but
  //      content fetch (FSA handle, file:// URL, IDB, sourceUrl)
  //      resolves async. If we queried the DOM before new content
  //      mounted, we'd hit the OLD file's rendered tasks and highlight
  //      the wrong row. Now we also depend on `content` so the effect
  //      re-fires once the new file's markdown has arrived.
  //
  //   2. MDX render lag. Even after `content` is set, react-markdown +
  //      the components map need a tick or two to mount, and task
  //      context population happens inside MDXViewer. Element may not
  //      exist on the first query. We poll briefly (every 100ms up to
  //      2s) until either we find the element or give up quietly.
  //
  //   3. Repeat clicks on the same row. scrollTarget includes a `rev`
  //      counter so identity changes even when fileId+line don't —
  //      effect re-fires, scroll repeats.
  useEffect(() => {
    if (!scrollTarget) return;
    if (!file || scrollTarget.fileId !== file.id) return;
    // Critical gate: wait until the RENDERED content is actually from
    // the target file. Viewer deliberately keeps the previous file's
    // content mounted during a file switch to avoid a Loading… flash,
    // so `content !== null` alone would let the querySelector hit the
    // old file's DOM. contentFileId only updates when setContent() is
    // called with bytes for a specific file, so this check correctly
    // waits for the new file's markdown to mount.
    if (contentFileId !== scrollTarget.fileId) return;

    let cancelled = false;
    let flashTimer: number | null = null;
    let attempt = 0;
    const MAX_ATTEMPTS = 20; // ~2s total polling
    const POLL_MS = 100;

    const tryScroll = () => {
      if (cancelled) return;
      // Clear any previous flash highlights — if the user clicks a
      // different row while a flash is active, the stale highlight on
      // the OLD row shouldn't linger alongside the new one.
      document
        .querySelectorAll<HTMLElement>(".fv-task-flash")
        .forEach((n) => n.classList.remove("fv-task-flash"));
      const el = document.querySelector<HTMLElement>(
        `[data-fv-task-line="${scrollTarget.line}"]`
      );
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.classList.add("fv-task-flash");
        flashTimer = window.setTimeout(() => {
          el.classList.remove("fv-task-flash");
        }, 1500);
        return;
      }
      attempt++;
      if (attempt < MAX_ATTEMPTS) {
        window.setTimeout(tryScroll, POLL_MS);
      }
    };

    // First tick after the current render; then poll if needed.
    const initialTimer = window.setTimeout(tryScroll, 50);
    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      if (flashTimer) window.clearTimeout(flashTimer);
    };
  }, [scrollTarget, file, contentFileId]);

  // Stabilize refs passed to <MDXViewer>. Without memoization, `assets` is a
  // brand-new function every render and the `file` prop is a fresh object
  // literal every render — both land in MDXViewer's `components` useMemo
  // dependency array, which busts the memo every render. That in turn gives
  // MDXComponentsProvider a new value, which re-renders every consumer
  // (CodeBlock's shiki pass, Tabs, Callout, TaskItem, …) — visible as
  // rapid flicker on any doc with multiple fenced code blocks or tabs.
  const assets = useMemo(() => {
    const dirHandle = folder?.id ? sessionHandles.getDir(folder.id) : null;
    return createFSAAssetResolver(dirHandle, file?.path ?? "");
  }, [folder?.id, file?.path, sessionRev]);
  const mdxFile = useMemo(
    () =>
      file
        ? {
            id: file.id,
            name: file.name,
            ext: file.ext,
            path: file.path,
            sourceUrl: file.sourceUrl,
          }
        : null,
    [file?.id, file?.name, file?.ext, file?.path, file?.sourceUrl]
  );

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

  // Block render when the in-state `content` belongs to the previously
  // active file. Without this, switching files mounts the OLD file's
  // markdown body inside the NEW file's frame for the few ms of the
  // async load — TaskCheckboxes mount with the wrong line numbers but
  // the correct file.id, then write/restore against the wrong file's
  // storage map (visible as "tasks unchecking themselves" when bouncing
  // between two TASKS.md files).
  if (loading || content === null || contentFileId !== file.id) {
    return <StateBlock>Loading…</StateBlock>;
  }

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
    file: mdxFile!,
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
      <BacklinksProvider value={backlinksValue}>
        <Renderer {...rendererProps} />
      </BacklinksProvider>
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
 *  here — through a live FSA folder handle, a loose-file FSA handle, or a
 *  file:// URL. */
export function fileIsRefreshable(
  file: { folderId?: string | null; id: string; sourceUrl?: string },
  handles: {
    getFile: (folderId: string, fileId: string) => unknown;
    getLoose: (fileId: string) => unknown;
  }
): boolean {
  if (file.folderId && handles.getFile(file.folderId, file.id)) return true;
  if (!file.folderId && handles.getLoose(file.id)) return true;
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
  if (!file.folderId) {
    const looseHandle = sessionHandles.getLoose(file.id);
    if (looseHandle) return await readFileAsText(looseHandle);
  }
  if (file.sourceUrl && file.sourceUrl.startsWith("file://")) {
    const r = await fetch(file.sourceUrl);
    if (r.ok) return await r.text();
  }
  return null;
}
