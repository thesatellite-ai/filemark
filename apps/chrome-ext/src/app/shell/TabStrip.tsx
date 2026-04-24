import { useMemo, useRef, useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import { useLibrary } from "../store";
import { cn } from "@/lib/utils";

/**
 * VS Code-style tab strip across the top of the viewer. Each open file is
 * a tab; the active tab is highlighted. Middle-click or the × button closes
 * a tab. Tabs auto-scroll to keep the active one in view. Tabs are
 * draggable — drop one onto another to reorder.
 */
export function TabStrip() {
  const files = useLibrary((s) => s.files);
  const openTabs = useLibrary((s) => s.openTabs);
  const activeId = useLibrary((s) => s.activeFileId);
  const setActive = useLibrary((s) => s.setActive);
  const closeTab = useLibrary((s) => s.closeTab);
  const reorderTabs = useLibrary((s) => s.reorderTabs);

  const items = useMemo(
    () =>
      openTabs
        .map((id) => files[id])
        .filter((f): f is NonNullable<typeof f> => !!f),
    [openTabs, files]
  );

  const stripRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);
  // { id, side } — which tab is currently a drop target and on which
  // edge the insertion line should render. Cleared on dragend / drop.
  const [dropTarget, setDropTarget] = useState<{ id: string; side: "before" | "after" } | null>(
    null
  );

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
        const isDropTarget = dropTarget?.id === f.id;
        return (
          <div
            key={f.id}
            data-tab-id={f.id}
            role="tab"
            aria-selected={isActive}
            draggable
            onDragStart={(e) => {
              dragIdRef.current = f.id;
              e.dataTransfer.effectAllowed = "move";
              // Some browsers require some data on dataTransfer to fire dragover.
              e.dataTransfer.setData("text/plain", f.id);
            }}
            onDragEnd={() => {
              dragIdRef.current = null;
              setDropTarget(null);
            }}
            onDragOver={(e) => {
              if (!dragIdRef.current || dragIdRef.current === f.id) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              const rect = e.currentTarget.getBoundingClientRect();
              const side = e.clientX < rect.left + rect.width / 2 ? "before" : "after";
              if (dropTarget?.id !== f.id || dropTarget?.side !== side) {
                setDropTarget({ id: f.id, side });
              }
            }}
            onDragLeave={(e) => {
              // Only clear when leaving this tab entirely (not when entering a child).
              if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
              if (dropTarget?.id === f.id) setDropTarget(null);
            }}
            onDrop={(e) => {
              const fromId = dragIdRef.current;
              const placement = dropTarget?.side ?? "before";
              dragIdRef.current = null;
              setDropTarget(null);
              if (!fromId || fromId === f.id) return;
              e.preventDefault();
              reorderTabs(fromId, f.id, placement);
            }}
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
            {isDropTarget && (
              <span
                className={cn(
                  "bg-primary pointer-events-none absolute inset-y-0 w-[2px]",
                  dropTarget?.side === "before" ? "left-0" : "right-0"
                )}
              />
            )}
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
