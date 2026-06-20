import {
  FolderOpen,
  List,
  PanelLeft,
  Crosshair,
  ExternalLink,
  RefreshCw,
  Search,
  Settings,
  Star,
  Sun,
  Moon,
  BookOpenText,
  BookOpen,
  ListTodo,
  Rocket,
  LifeBuoy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLibrary } from "../store";
import { isInjectMode } from "../urlSync";
import {
  isFileAccessAllowed,
  isRemoteAllowed,
  openWelcome,
} from "@/lib/permissions";
import { pickFolder } from "../fs";
import { sessionHandles } from "../sessionHandles";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemePopover } from "./ThemePopover";
import { FileActions } from "./FileActions";
import { cn } from "@/lib/utils";

// External destinations surfaced in the toolbar. Issues page doubles as the
// support channel (no separate support inbox — GitHub issues is canonical).
const WEBSITE_URL = "https://khanakia.com/apps/filemark/";
const ISSUES_URL = "https://github.com/thesatellite-ai/filemark/issues";

// Open in a new tab. `noopener,noreferrer` so the opened page can't reach
// back via window.opener — works identically in the extension page and in
// the injected content-script context (a plain https navigation).
function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function TopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const toggleSidebar = useLibrary((s) => s.toggleSidebar);
  const toggleToc = useLibrary((s) => s.toggleToc);
  const toggleTasksPanel = useLibrary((s) => s.toggleTasksPanel);
  const toggleReadingMode = useLibrary((s) => s.toggleReadingMode);
  const readingMode = useLibrary((s) => s.readingMode);
  const revealActiveInSidebar = useLibrary((s) => s.revealActiveInSidebar);
  const tasksOpen = useLibrary((s) => s.tasksOpen);
  const toggleAutoRefresh = useLibrary((s) => s.toggleAutoRefresh);
  const autoRefresh = useLibrary((s) => s.autoRefresh);
  const autoRefreshMs = useLibrary((s) => s.autoRefreshMs);
  const addFolder = useLibrary((s) => s.addFolder);
  const theme = useLibrary((s) => s.theme);
  const activeFile = useLibrary((s) =>
    s.activeFileId ? s.files[s.activeFileId] : null
  );
  const toggleStar = useLibrary((s) => s.toggleStar);

  // Setup status for the toolbar "Setup" button. Only meaningful in the
  // standalone app (the injected viewer's content-script context has no
  // chrome.permissions / chrome.extension). `null` = unknown/not-app; the dot
  // shows only when we positively know a gate is off.
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  useEffect(() => {
    if (isInjectMode()) return;
    let active = true;
    const check = () => {
      void Promise.all([isFileAccessAllowed(), isRemoteAllowed()]).then(
        ([file, remote]) => {
          if (active) setSetupComplete(file && remote);
        },
      );
    };
    check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    chrome.permissions?.onAdded?.addListener(check);
    chrome.permissions?.onRemoved?.addListener(check);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      chrome.permissions?.onAdded?.removeListener(check);
      chrome.permissions?.onRemoved?.removeListener(check);
    };
  }, []);

  const openOptions = () => {
    // In the extension app/options context openOptionsPage is available. In a
    // content script (injected file:// viewer) it is NOT, and the options page
    // isn't web-accessible, so window.open(getURL(...)) is blocked too — ask
    // the service worker to open it instead. Plain localhost dev falls back to
    // a relative URL.
    if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: "fv:open-options" });
    } else {
      window.open("../options/index.html", "_blank");
    }
  };

  const onPickFolder = async () => {
    if (!hasDirectoryPicker()) return;
    try {
      const result = await pickFolder();
      if (!result) return;
      sessionHandles.register(
        result.folder.id,
        result.folder.handle!,
        result.fileHandles
      );
      await addFolder(result.folder, result.files);
      useLibrary.setState((s) => ({ sessionRev: s.sessionRev + 1 }));
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") console.error(e);
    }
  };

  return (
    <header className="bg-background flex h-11 shrink-0 items-center gap-1 px-2">
      <div className="flex items-center gap-1">
        {/* Library/multi-file controls (sidebar toggle, Open Folder, reveal-in-
            sidebar) are hidden in the injected file:// viewer: it shows a single
            file with the sidebar collapsed, so they have nothing to act on. */}
        {!isInjectMode() && (
          <IconBtn
            onClick={toggleSidebar}
            title="Toggle sidebar (⌘B)"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="size-4" />
          </IconBtn>
        )}
        {/* Brand doubles as the website link (logo-home convention). */}
        <button
          type="button"
          onClick={() => openExternal(WEBSITE_URL)}
          title="Filemark website"
          aria-label="Open the Filemark website"
          className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-sm font-semibold tracking-tight transition-colors"
        >
          <BookOpenText className="text-primary size-4" />
          <span className="hidden sm:inline">Filemark</span>
        </button>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
        {activeFile && (
          <>
            <span
              className="text-muted-foreground hidden max-w-[520px] truncate text-xs sm:inline"
              title={activeFile.path}
            >
              {activeFile.path}
            </span>
            <IconBtn
              onClick={() => toggleStar(activeFile.id)}
              title={activeFile.starred ? "Unstar" : "Star"}
              aria-label={activeFile.starred ? "Unstar" : "Star"}
            >
              <Star
                className={cn(
                  "size-3.5",
                  activeFile.starred && "fill-yellow-400 text-yellow-400"
                )}
              />
            </IconBtn>
            <FileActions file={activeFile} />
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        {!isInjectMode() && hasDirectoryPicker() && (
          <Button
            variant="outline"
            size="sm"
            className="hidden h-7 px-2 text-xs font-normal sm:inline-flex"
            onClick={onPickFolder}
            aria-label="Open Folder"
            title="Open Folder"
          >
            <FolderOpen className="size-3.5" />
            <span className="hidden sm:inline"> Open Folder</span>
          </Button>
        )}
        {isInjectMode() ? (
          <IconBtn
            // file:// pages have an opaque (null) origin, so the content
            // script can't fetch the file to re-read it (CORS blocks the
            // file: scheme). Reloading the page makes Chrome re-read the
            // file from disk and re-inject with fresh content.
            onClick={() => window.location.reload()}
            title="Reload this file from disk"
            aria-label="Reload from source"
          >
            <RefreshCw className="size-4" />
          </IconBtn>
        ) : (
          <IconBtn
            onClick={toggleAutoRefresh}
            title={
              autoRefresh
                ? `Auto-refresh on — polling active file + all folders every ${(autoRefreshMs / 1000).toFixed(1)}s. Click to stop.`
                : `Auto-refresh off — click to poll every ${(autoRefreshMs / 1000).toFixed(1)}s.`
            }
            aria-label="Auto-refresh"
            aria-pressed={autoRefresh}
          >
            <RefreshCw
              className={cn(
                "size-4 transition-colors",
                autoRefresh && "text-emerald-500",
              )}
            />
          </IconBtn>
        )}
        <IconBtn onClick={onOpenSearch} title="Search (⌘K)" aria-label="Search">
          <Search className="size-4" />
        </IconBtn>
        <IconBtn
          onClick={toggleToc}
          title="Table of contents"
          aria-label="TOC"
          className="hidden md:inline-flex"
        >
          <List className="size-4" />
        </IconBtn>
        {activeFile && !isInjectMode() && (
          <IconBtn
            onClick={revealActiveInSidebar}
            title="Reveal current file in sidebar"
            aria-label="Reveal in sidebar"
            className="hidden md:inline-flex"
          >
            <Crosshair className="size-4" />
          </IconBtn>
        )}
        <IconBtn
          onClick={toggleTasksPanel}
          title="Tasks panel (⌘T)"
          aria-label="Tasks panel"
          className={cn(
            tasksOpen && "bg-accent text-accent-foreground"
          )}
        >
          <ListTodo className="size-4" />
        </IconBtn>
        {/* Reading mode only hides the sidebar + tasks panel — both already
            off in the injected single-file viewer, so the toggle is a no-op
            there. Hide it in inject (like the other library-only controls). */}
        {!isInjectMode() && (
          <IconBtn
            onClick={toggleReadingMode}
            title={readingMode ? "Exit reading mode (⇧F)" : "Reading mode (⇧F)"}
            aria-label="Reading mode"
            className={cn(readingMode && "bg-accent text-accent-foreground")}
          >
            <BookOpen className="size-4" />
          </IconBtn>
        )}
        {isInjectMode() && activeFile?.sourceUrl && (
          <IconBtn
            onClick={() => {
              const target = `${chrome.runtime.getURL("src/app/index.html")}?openFile=${encodeURIComponent(activeFile.sourceUrl ?? "")}`;
              window.open(target, "_blank");
            }}
            title="Open in full Filemark (new tab)"
            aria-label="Open in full Filemark"
          >
            <ExternalLink className="size-4" />
          </IconBtn>
        )}
        {!isInjectMode() && (
          <IconBtn
            onClick={openWelcome}
            title={
              setupComplete === false
                ? "Finish setup — some local or remote files won't render yet"
                : "Setup"
            }
            aria-label="Setup"
          >
            <span className="relative inline-flex">
              <Rocket className="size-4" />
              {setupComplete === false && (
                <span className="ring-background absolute -right-1 -top-1 size-2 rounded-full bg-amber-500 ring-2" />
              )}
            </span>
          </IconBtn>
        )}
        <IconBtn
          onClick={() => openExternal(ISSUES_URL)}
          title="Report an issue / get support"
          aria-label="Report an issue or get support on GitHub"
        >
          <LifeBuoy className="size-4" />
        </IconBtn>
        <ThemePopover>
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0"
            aria-label="Appearance"
            title="Appearance"
          >
            {theme.mode === "dark" ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
          </Button>
        </ThemePopover>
        <IconBtn
          onClick={openOptions}
          title="Options"
          aria-label="Options"
        >
          <Settings className="size-4" />
        </IconBtn>
      </div>
    </header>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  "aria-label": ariaLabel,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  "aria-label"?: string;
  className?: string;
}) {
  const button = (
    <Button
      variant="ghost"
      size="sm"
      className={cn("size-7 p-0", className)}
      onClick={onClick}
      // Native `title=` kept too for screen-reader / right-click-info
      // discoverability; the Base UI Tooltip provides the visible UX.
      title={title}
      aria-label={ariaLabel ?? title}
    >
      {children}
    </Button>
  );
  if (!title) return button;
  // Prefer children over `render={…}` for the trigger — see CLAUDE.md
  // base-ui quirks (render with a nested component throws #31).
  return (
    <Tooltip>
      <TooltipTrigger>{button}</TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

/** Feature-detect File System Access — desktop Chromium / Edge only. Mobile
 *  Chrome lacks `showDirectoryPicker`, so we hide the Open Folder button
 *  there (drag-drop in DropZone still works on touch). */
function hasDirectoryPicker(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { showDirectoryPicker?: unknown })
      .showDirectoryPicker === "function"
  );
}
