import type { ReactNode } from "react";

/**
 * Horizontal scrollable container for columns. Height is owned by
 * the caller so fullscreen can use `"100%"` and inline can use a
 * fixed number.
 */
export function Board({
  height,
  children,
}: {
  height: number | string;
  children: ReactNode;
}) {
  return (
    <div
      className="overflow-auto"
      style={{ height, maxHeight: height }}
    >
      <div className="flex h-full min-h-0 items-stretch gap-3 p-3">
        {children}
      </div>
    </div>
  );
}
