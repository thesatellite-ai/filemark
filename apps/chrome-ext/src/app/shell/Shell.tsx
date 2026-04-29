import { useEffect, useState } from "react";
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
