import { useRef } from "react";
import { X } from "lucide-react";
import { useStore } from "./store";

const base = (p: string): string => p.split("/").pop() || p;

export function TabStrip(): React.ReactElement | null {
  const { openTabs, activeId, files, setActive, closeTab, reorderTabs } =
    useStore();
  const dragFrom = useRef<number | null>(null);
  if (openTabs.length === 0) return null;

  return (
    <div className="flex items-stretch overflow-x-auto border-b border-border bg-background/40 text-[13px] backdrop-blur-sm">
      {openTabs.map((id, i) => {
        const f = files[id];
        const on = activeId === id;
        return (
          <div
            key={id}
            draggable
            onDragStart={() => (dragFrom.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragFrom.current != null) reorderTabs(dragFrom.current, i);
              dragFrom.current = null;
            }}
            onClick={() => setActive(id)}
            title={f?.relPath ?? id}
            className={`group relative flex max-w-[210px] cursor-pointer items-center gap-2 border-r border-border px-3.5 py-2 transition-colors ${
              on
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            }`}
          >
            {on && (
              <span className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
            )}
            <span className="truncate">{f ? base(f.relPath) : id}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(id);
              }}
              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
              title="Close tab"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
