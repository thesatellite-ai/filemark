import { useEffect, useRef, useState } from "react";
import { useLibrary } from "../store";
import {
  useSettings,
  isShortcutEnabled,
  getShortcutCode,
  matchShortcut,
} from "../settings";
import { useUrlSync } from "../urlSync";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { SidebarResizer } from "./SidebarResizer";
import { Viewer } from "./Viewer";
import { DropZone } from "./DropZone";
import { SearchPalette } from "./SearchPalette";
import { TabStrip } from "./TabStrip";
import { TaskPanel } from "./TaskPanel";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";

export function Shell() {
  const hydrated = useLibrary((s) => s.hydrated);
  const sidebarOpen = useLibrary((s) => s.sidebarOpen);
  const fullscreen = useLibrary((s) => s.fullscreen);
  const tasksOpen = useLibrary((s) => s.tasksOpen);
  const toggleSidebar = useLibrary((s) => s.toggleSidebar);
  const toggleToc = useLibrary((s) => s.toggleToc);
  const toggleTasksPanel = useLibrary((s) => s.toggleTasksPanel);
  const toggleFullscreen = useLibrary((s) => s.toggleFullscreen);
  const activeId = useLibrary((s) => s.activeFileId);
  const setActive = useLibrary((s) => s.setActive);
  const openTabs = useLibrary((s) => s.openTabs);
  const closeTab = useLibrary((s) => s.closeTab);
  const nextTab = useLibrary((s) => s.nextTab);
  const prevTab = useLibrary((s) => s.prevTab);
  const viewMode = useLibrary((s) => s.viewMode);
  const setViewMode = useLibrary((s) => s.setViewMode);
  const settings = useSettings((s) => s.settings);
  useUrlSync();

  const [searchOpen, setSearchOpen] = useState(false);
  // Optional folder scope for the search palette. Null = all files.
  // Set by the per-folder search icon in the Sidebar; cleared by the
  // chip inside the palette or when the palette closes.
  const [searchScope, setSearchScope] = useState<string | null>(null);

  // Sidebar fires a scoped-search request via the store (so the button
  // doesn't need to thread a callback through three component layers).
  // We listen for the rev counter and open the palette pre-scoped.
  const scopedSearchRequest = useLibrary((s) => s.scopedSearchRequest);
  useEffect(() => {
    if (!scopedSearchRequest) return;
    setSearchScope(scopedSearchRequest.folderId);
    setSearchOpen(true);
  }, [scopedSearchRequest?.rev]);

  // Auto-collapse the sidebar drawer when the active file changes on a
  // mobile-width viewport (so picking a file from the slide-over closes
  // it and reveals the viewer underneath). No-op on md+ where sidebar
  // is in-flow next to the viewer.
  useEffect(() => {
    if (!sidebarOpen || !activeId) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    toggleSidebar();
    // Run only when the active file id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Esc exits fullscreen regardless of shortcut settings — always safe.
      if (e.key === "Escape") {
        setSearchOpen(false);
        if (fullscreen) toggleFullscreen();
        return;
      }
      // ── Bare-key shortcuts (no modifiers) ──
      // All shortcut matches use `e.code` (physical key position) so they
      // work across keyboard layouts (Turkish Q, AZERTY, Dvorak, Cyrillic,
      // …) without forcing the user to press AltGr combos. The user can
      // remap any shortcut from the options page; bindings live in
      // `settings.shortcutBindings`.
      //
      // Chrome reserves every Ctrl/⌘/Alt tab-management combination, so
      // tab navigation stays on bare keys and we gate on "not typing in
      // an input" so the search palette / filter inputs aren't shadowed.
      if (!isInInput(e)) {
        if (
          isShortcutEnabled(settings, "nextTab") &&
          matchShortcut(e, getShortcutCode(settings, "nextTab"))
        ) {
          e.preventDefault();
          nextTab();
          return;
        }
        if (
          isShortcutEnabled(settings, "prevTab") &&
          matchShortcut(e, getShortcutCode(settings, "prevTab"))
        ) {
          e.preventDefault();
          prevTab();
          return;
        }
        if (
          activeId &&
          isShortcutEnabled(settings, "closeTab") &&
          matchShortcut(e, getShortcutCode(settings, "closeTab"))
        ) {
          e.preventDefault();
          closeTab(activeId);
          return;
        }
        // Jump-to-tab: range match Digit1–Digit9 (no remap UI for ranges).
        if (
          !e.metaKey && !e.ctrlKey && !e.altKey &&
          /^Digit[1-9]$/.test(e.code)
        ) {
          if (!isShortcutEnabled(settings, "jumpToTab")) return;
          const idx = Number(e.code.slice(5)) - 1;
          const target = openTabs[idx];
          if (target) {
            e.preventDefault();
            if (target !== activeId) setActive(target);
          }
          return;
        }
      }

      // ── Modifier + bare-key shortcuts ──
      if (
        isShortcutEnabled(settings, "search") &&
        matchShortcut(e, getShortcutCode(settings, "search"))
      ) {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      if (
        isShortcutEnabled(settings, "toggleSidebar") &&
        matchShortcut(e, getShortcutCode(settings, "toggleSidebar"))
      ) {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      // ⌘T — toggle the cross-file task panel.
      // Note: bare ⌘T opens a new browser tab. Our ext runs in its
      // own chrome-extension://… page so the default is free.
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyT") {
        e.preventDefault();
        toggleTasksPanel();
        return;
      }
      if (
        !isInInput(e) &&
        isShortcutEnabled(settings, "toggleToc") &&
        matchShortcut(e, getShortcutCode(settings, "toggleToc"))
      ) {
        e.preventDefault();
        toggleToc();
        return;
      }
      if (
        !isInInput(e) &&
        isShortcutEnabled(settings, "toggleFullscreen") &&
        matchShortcut(e, getShortcutCode(settings, "toggleFullscreen"))
      ) {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (
        !isInInput(e) &&
        isShortcutEnabled(settings, "toggleRaw") &&
        matchShortcut(e, getShortcutCode(settings, "toggleRaw"))
      ) {
        // Only meaningful when a file is active — and we rely on file-
        // actions for the state toggle so the FileActions UI stays in sync.
        if (!activeId) return;
        e.preventDefault();
        setViewMode(viewMode === "raw" ? "rendered" : "raw");
        return;
      }
      if (
        !isInInput(e) &&
        isShortcutEnabled(settings, "focusFilter") &&
        matchShortcut(e, getShortcutCode(settings, "focusFilter"))
      ) {
        e.preventDefault();
        // Focus the first visible folder filter input.
        const input = document.querySelector<HTMLInputElement>(
          'aside input[placeholder*="Filter"]'
        );
        input?.focus();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    toggleSidebar,
    toggleToc,
    toggleTasksPanel,
    toggleFullscreen,
    setActive,
    setViewMode,
    viewMode,
    fullscreen,
    settings,
    nextTab,
    prevTab,
    closeTab,
    activeId,
    openTabs,
  ]);

  if (!hydrated) {
    return (
      <div className="bg-background text-muted-foreground grid h-full place-items-center text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground flex h-full w-full flex-col">
      {!fullscreen && (
        <>
          <TopBar onOpenSearch={() => setSearchOpen(true)} />
          <Separator />
        </>
      )}
      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen && !fullscreen && (
          <>
            {/* Mobile backdrop — clicking it closes the slide-over sidebar. */}
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={toggleSidebar}
              className="fixed inset-0 z-30 bg-black/40 md:hidden"
            />
            {/* Sidebar: fixed slide-over below md, in-flow on md+. */}
            <div className="fixed inset-y-0 left-0 z-40 flex shadow-xl md:static md:z-auto md:shadow-none">
              <Sidebar />
              <SidebarResizer />
            </div>
          </>
        )}
        <main className="relative flex min-w-0 flex-1 flex-col">
          {!fullscreen && <TabStrip />}
          <ViewerScroll activeId={activeId}>
            <Viewer />
          </ViewerScroll>
          {fullscreen && (
            <Button
              variant="ghost"
              size="sm"
              className="fixed right-3 top-3 z-50 size-7 p-0 opacity-60 hover:opacity-100"
              onClick={toggleFullscreen}
              title="Exit fullscreen (Esc or F)"
              aria-label="Exit fullscreen"
            >
              <Minimize2 className="size-4" />
            </Button>
          )}
          {!fullscreen && (
            <Button
              variant="ghost"
              size="sm"
              className="fixed bottom-3 right-3 z-40 size-7 p-0 opacity-40 transition-opacity hover:opacity-100"
              onClick={toggleFullscreen}
              title="Fullscreen (F)"
              aria-label="Fullscreen"
            >
              <Maximize2 className="size-4" />
            </Button>
          )}
        </main>
        {tasksOpen && !fullscreen && (
          <>
            <button
              type="button"
              aria-label="Close tasks panel"
              onClick={toggleTasksPanel}
              className="fixed inset-0 z-30 bg-black/40 md:hidden"
            />
            <div className="fixed inset-y-0 right-0 z-40 flex shadow-xl md:static md:z-auto md:shadow-none">
              <Separator orientation="vertical" />
              <TaskPanel />
            </div>
          </>
        )}
      </div>
      <DropZone />
      <SearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        scope={searchScope}
        onScopeChange={setSearchScope}
      />
    </div>
  );
}

function isInInput(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}

/**
 * Scroll-position memory per active file.
 *
 * Saves the viewer's scrollTop on every scroll (per file id), then restores
 * it whenever the active file changes. The new file's content loads
 * asynchronously (Viewer gates on `contentFileId === file.id`), so we keep
 * trying to apply the saved offset across animation frames until the
 * scroll container actually has the height to support it.
 *
 * Memory lives in a ref Map — ephemeral, in-memory only. Closing the
 * extension tab drops everything. No need to round-trip through IDB for
 * a UI nicety like this.
 */
function ViewerScroll({
  activeId,
  children,
}: {
  activeId: string | null;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const positions = useRef<Map<string, number>>(new Map());
  const lastIdRef = useRef<string | null>(null);
  // True while the restore loop is mid-flight. Blocks the scroll
  // listener from saving the browser-clamped intermediate values
  // that fire as we set scrollTop on a still-loading body.
  const suppressSaveRef = useRef(false);

  // Save on scroll (always for the currently-active id, except while
  // restore is running).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (suppressSaveRef.current) return;
      if (!activeId) return;
      positions.current.set(activeId, el.scrollTop);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeId]);

  // Restore when activeId changes. The new file's content loads + grows
  // asynchronously (markdown parse, shiki code highlight, mermaid /
  // schema diagrams, table layout, image load). The browser silently
  // clamps `scrollTop` to `scrollHeight - clientHeight`, so an early
  // restore to e.g. 1200px lands at 800px while the body is still 900
  // tall.
  //
  // While restoring we ALSO suppress the scroll listener (via a ref
  // flag), so the clamped intermediate values don't overwrite the
  // saved target with junk. Without this, an early `el.scrollTop = 1200`
  // → browser clamps to 800 → scroll event fires → onScroll writes
  // 800 to positions[id] → next restore lands at 800 forever.
  useEffect(() => {
    if (!activeId) return;
    if (activeId === lastIdRef.current) return;
    const target = positions.current.get(activeId) ?? 0;
    lastIdRef.current = activeId;
    const el = containerRef.current;
    if (!el) return;
    if (target === 0) {
      el.scrollTop = 0;
      return;
    }

    // Pin the scroll for up to 3s regardless of whether apply succeeds
    // early — late renders (shiki, mermaid, images) can re-layout the
    // body after the first success and shift scrollTop by 50–100px.
    // Re-pinning every frame keeps it nailed.
    //
    // We bail the moment the user grabs the scroll themselves (wheel,
    // touch drag, keyboard nav, scrollbar drag). Otherwise the pin
    // would fight every input → frozen scroll.
    const MAX_MS = 3000;
    const startedAt = performance.now();
    let cancelled = false;
    let userTookOver = false;
    suppressSaveRef.current = true;

    const stop = () => {
      cancelled = true;
      userTookOver = true;
      suppressSaveRef.current = false;
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("keydown", stop);
      el.removeEventListener("mousedown", onMouseDown);
    };
    // Scrollbar drag fires `mousedown` on the container body but not
    // on its content children. Distinguish via `event.target === el`
    // (the scrollbar grabs the container itself, not its inner div).
    const onMouseDown = (e: MouseEvent) => {
      if (e.target === el) stop();
    };
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("keydown", stop);
    el.addEventListener("mousedown", onMouseDown);

    const tick = () => {
      if (cancelled || userTookOver) return;
      // Re-pin to target every frame.
      if (el.scrollTop !== target) {
        el.scrollTop = target;
      }
      if (performance.now() - startedAt > MAX_MS) {
        // Window closed normally — release the listener. If we never
        // reached target (content too short after 3s), save the
        // clamped value so we don't keep over-shooting on the next
        // visit.
        if (el.scrollTop !== target) {
          positions.current.set(activeId, el.scrollTop);
        }
        suppressSaveRef.current = false;
        stop();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => {
      stop();
    };
  }, [activeId]);

  return (
    <div ref={containerRef} className="relative flex-1 overflow-auto">
      {children}
    </div>
  );
}
