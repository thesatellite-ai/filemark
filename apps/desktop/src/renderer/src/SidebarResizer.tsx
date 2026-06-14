import { useEffect, useRef } from "react";

export const SIDEBAR_DEFAULT_WIDTH = 256;
export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 560;

const clamp = (n: number): number =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, n));

/**
 * Sidebar drag handle — live DOM, commit on release.
 *
 * Earlier version called setWidth on every pointermove, which re-rendered
 * the whole Shell + wrote to libsql 60×/sec → laggy. Now the drag writes
 * `style.width` directly on the target element via the ref, and only
 * on `pointerup` does it commit the final width to React state +
 * persistence (one re-render, one IPC write).
 *
 * Listeners install once on mount + read the latest commit callback via
 * a ref, so a parent re-render can't kill the drag mid-stroke.
 */
export function SidebarResizer({
  targetRef,
  initialWidth,
  onCommit,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  initialWidth: number;
  onCommit: (width: number) => void;
}): React.ReactElement {
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  const dragRef = useRef<{
    startX: number;
    startWidth: number;
    last: number;
    raf: number | null;
  } | null>(null);
  const movingRef = useRef<((e: PointerEvent) => void) | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent): void => {
      const d = dragRef.current;
      if (!d) return;
      const w = clamp(d.startWidth + (e.clientX - d.startX));
      d.last = w;
      if (d.raf != null) return;
      d.raf = requestAnimationFrame(() => {
        const cur = dragRef.current;
        if (!cur) return;
        cur.raf = null;
        if (targetRef.current) targetRef.current.style.width = `${cur.last}px`;
      });
    };
    const stop = (): void => {
      const d = dragRef.current;
      if (d?.raf != null) cancelAnimationFrame(d.raf);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      if (d) commitRef.current(d.last); // single state+persist write
      dragRef.current = null;
    };
    movingRef.current = onMove;
    stopRef.current = stop;
    return stop;
  }, [targetRef]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      title="Drag to resize · double-click to reset"
      onPointerDown={(e) => {
        e.preventDefault();
        dragRef.current = {
          startX: e.clientX,
          startWidth: initialWidth,
          last: initialWidth,
          raf: null,
        };
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        if (movingRef.current && stopRef.current) {
          window.addEventListener("pointermove", movingRef.current);
          window.addEventListener("pointerup", stopRef.current);
        }
      }}
      onDoubleClick={() => {
        if (targetRef.current)
          targetRef.current.style.width = `${SIDEBAR_DEFAULT_WIDTH}px`;
        onCommit(SIDEBAR_DEFAULT_WIDTH);
      }}
      className="relative z-10 w-px shrink-0 cursor-col-resize touch-none select-none bg-border transition-colors hover:bg-primary/40 active:bg-primary/60"
    >
      <span aria-hidden className="absolute inset-y-0 -right-1 w-2" />
    </div>
  );
}
