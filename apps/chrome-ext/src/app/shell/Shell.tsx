import { useEffect, useState } from "react";
import { useLibrary } from "../store";
import { useSettings, isShortcutEnabled } from "../settings";
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
      // ── Tab shortcuts (bare keys, no modifiers) ──
      // Chrome reserves every Ctrl/⌘/Alt combination we tried for its own
      // tab management — preventDefault from chrome-extension:// pages
      // cannot reliably override them. Bare keys with no modifiers are the
      // only reliably available surface, so we gate them on "not typing in
      // an input" and use Vim-style chords.
      //
      //   ]      next tab
      //   [      previous tab
      //   x      close active tab
      //   1..9   jump to tab by position
      //
      // These only fire when no input / textarea / contenteditable has
      // focus, so typing in the search palette or filter is unaffected.
      if (!isInInput(e) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === "]") {
          if (!isShortcutEnabled(settings, "nextTab")) return;
          e.preventDefault();
          nextTab();
          return;
        }
        if (e.key === "[") {
          if (!isShortcutEnabled(settings, "prevTab")) return;
          e.preventDefault();
          prevTab();
          return;
        }
        if ((e.key === "x" || e.key === "X") && activeId) {
          if (!isShortcutEnabled(settings, "closeTab")) return;
          e.preventDefault();
          closeTab(activeId);
          return;
        }
        if (/^[1-9]$/.test(e.key)) {
          if (!isShortcutEnabled(settings, "jumpToTab")) return;
          const idx = Number(e.key) - 1;
          const target = openTabs[idx];
          if (target) {
            e.preventDefault();
            if (target !== activeId) setActive(target);
          }
          return;
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        if (!isShortcutEnabled(settings, "search")) return;
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        if (!isShortcutEnabled(settings, "toggleSidebar")) return;
        e.preventDefault();
        toggleSidebar();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "t" || e.key === "T")) {
        // ⌘T — toggle the cross-file task panel.
        // Note: bare ⌘T opens a new browser tab. Our ext runs in its
        // own chrome-extension://… page so the default is free.
        e.preventDefault();
        toggleTasksPanel();
      } else if (e.key === "\\" && !isInInput(e)) {
        if (!isShortcutEnabled(settings, "toggleToc")) return;
        e.preventDefault();
        toggleToc();
      } else if ((e.key === "f" || e.key === "F") && !isInInput(e) && !e.metaKey && !e.ctrlKey) {
        if (!isShortcutEnabled(settings, "toggleFullscreen")) return;
        e.preventDefault();
        toggleFullscreen();
      } else if ((e.key === "r" || e.key === "R") && !isInInput(e) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!isShortcutEnabled(settings, "toggleRaw")) return;
        // Only meaningful when a file is active — and we rely on file-
        // actions for the state toggle so the FileActions UI stays in sync.
        if (!activeId) return;
        e.preventDefault();
        setViewMode(viewMode === "raw" ? "rendered" : "raw");
      } else if (e.key === "/" && !isInInput(e)) {
        if (!isShortcutEnabled(settings, "focusFilter")) return;
        e.preventDefault();
        // Focus the first visible folder filter input.
        const input = document.querySelector<HTMLInputElement>(
          'aside input[placeholder*="Filter"]'
        );
        input?.focus();
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
          <div className="relative flex-1 overflow-auto">
            <Viewer />
          </div>
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
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

function isInInput(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}
