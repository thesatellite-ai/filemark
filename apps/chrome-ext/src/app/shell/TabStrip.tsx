import { useMemo, useRef, useEffect } from "react";
import { FileText, X } from "lucide-react";
import { useLibrary } from "../store";
import { cn } from "@/lib/utils";

/**
 * VS Code-style tab strip across the top of the viewer. Each open file is
 * a tab; the active tab is highlighted. Middle-click or the × button closes
 * a tab. Tabs auto-scroll to keep the active one in view.
 */
export function TabStrip() {
  const files = useLibrary((s) => s.files);
  const openTabs = useLibrary((s) => s.openTabs);
  const activeId = useLibrary((s) => s.activeFileId);
  const setActive = useLibrary((s) => s.setActive);
  const closeTab = useLibrary((s) => s.closeTab);

  const items = useMemo(
    () =>
      openTabs
        .map((id) => files[id])
        .filter((f): f is NonNullable<typeof f> => !!f),
    [openTabs, files]
  );

  const stripRef = useRef<HTMLDivElement>(null);

  // Keep the active tab in view when it changes.
  useEffect(() => {
    if (!stripRef.current || !activeId) return;
    const el = stripRef.current.querySelector<HTMLElement>(
      `[data-tab-id="${CSS.escape(activeId)}"]`
    );
    if (el) el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  if (items.length === 0) return null;

  return (
    <div
      ref={stripRef}
      className="bg-muted/40 scrollbar-thin flex h-8 shrink-0 items-stretch overflow-x-auto border-b"
      role="tablist"
    >
      {items.map((f) => {
        const isActive = f.id === activeId;
        return (
          <div
            key={f.id}
            data-tab-id={f.id}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "group/tab relative flex shrink-0 cursor-pointer items-center gap-1.5 border-r px-3 text-[12px] transition-colors",
              isActive
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
            onClick={() => setActive(f.id)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                closeTab(f.id);
              }
            }}
            title={f.path}
          >
            <FileText
              className={cn(
                "size-3.5 shrink-0",
                f.ext === "md" || f.ext === "mdx"
                  ? "text-blue-400"
                  : f.ext === "json" || f.ext === "jsonc"
                    ? "text-amber-400"
                    : "text-muted-foreground"
              )}
            />
            <span className="max-w-[220px] truncate">{f.name}</span>
            <button
              type="button"
              className={cn(
                "ml-1 flex size-4 items-center justify-center rounded-sm transition-opacity",
                "hover:bg-accent hover:text-accent-foreground",
                isActive ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover/tab:opacity-60 group-hover/tab:hover:opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(f.id);
              }}
              aria-label={`Close ${f.name}`}
              title="Close (⌘W)"
            >
              <X className="size-3" />
            </button>
            {isActive && (
              <span className="bg-primary absolute inset-x-0 top-0 h-[2px]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
