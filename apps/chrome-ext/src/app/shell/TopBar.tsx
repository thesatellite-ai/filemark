import {
  FolderOpen,
  List,
  PanelLeft,
  Crosshair,
  RefreshCw,
  Search,
  Settings,
  Star,
  Sun,
  Moon,
  BookOpenText,
  ListTodo,
} from "lucide-react";
import { useLibrary } from "../store";
import { pickFolder } from "../fs";
import { sessionHandles } from "../sessionHandles";
import { Button } from "@/components/ui/button";
import { ThemePopover } from "./ThemePopover";
import { FileActions } from "./FileActions";
import { cn } from "@/lib/utils";

export function TopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const toggleSidebar = useLibrary((s) => s.toggleSidebar);
  const toggleToc = useLibrary((s) => s.toggleToc);
  const toggleTasksPanel = useLibrary((s) => s.toggleTasksPanel);
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

  const openOptions = () => {
    // chrome.runtime.openOptionsPage is available in extension contexts;
    // fall back to constructing the URL when running under localhost for dev.
    if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
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
        <IconBtn
          onClick={toggleSidebar}
          title="Toggle sidebar (⌘B)"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="size-4" />
        </IconBtn>
        <span className="flex items-center gap-1.5 px-1.5 text-sm font-semibold tracking-tight">
          <BookOpenText className="text-primary size-4" />
          <span className="hidden sm:inline">Filemark</span>
        </span>
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
        {hasDirectoryPicker() && (
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
        {activeFile && (
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
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("size-7 p-0", className)}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
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
