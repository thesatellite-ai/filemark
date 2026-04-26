import { useCallback, useEffect, useRef } from "react";
import { useLibrary } from "../store";

/**
 * 4px wide vertical drag handle that lives in place of the old fixed
 * `<Separator orientation="vertical" />` between Sidebar and main.
 *
 * Drag → updates `sidebarWidth` in the store (clamped + persisted).
 * Double-click → resets to the default 256px width.
 *
 * The handle is full-height + has an extended invisible hit area on the
 * right edge so the user doesn't have to pixel-hunt. While dragging we
 * lock the document cursor + disable text selection, then restore on
 * pointerup.
 */
export function SidebarResizer() {
  const sidebarWidth = useLibrary((s) => s.sidebarWidth);
  const setSidebarWidth = useLibrary((s) => s.setSidebarWidth);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      setSidebarWidth(drag.startWidth + dx);
    },
    [setSidebarWidth],
  );

  const stopDragging = useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDragging);
  }, [onPointerMove]);

  useEffect(() => {
    return () => stopDragging();
  }, [stopDragging]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
  };

  const onDoubleClick = () => {
    setSidebarWidth(256);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      className="group/resizer relative z-10 flex w-px shrink-0 cursor-col-resize touch-none select-none bg-border hover:bg-primary/40 active:bg-primary/60"
    >
      {/* Wider invisible hit zone on the right side so the user doesn't
          have to pixel-target the 1px line. */}
      <span
        aria-hidden
        className="absolute inset-y-0 -right-1 w-2"
      />
    </div>
  );
}
