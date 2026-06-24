// REVISION MODE — history side panel (feature map: revision/RevisionProvider.tsx).
//
// Right-rail list of revisions for quick browsing: click a row to load that
// revision read-only into the MAIN viewer (inline preview, no modal); step
// through by clicking different rows. Per-row "Diff vs previous" shows the
// reading-diff inline. Also hosts the revision-mode toggle + Snapshot / Clear /
// Full-compare. Mirrors the NotesPanel layout.
import { useCallback, useRef, useState } from "react";
import {
  History,
  X,
  Eye,
  GitCompareArrows,
  Camera,
  Trash2,
  Maximize2,
  Power,
} from "lucide-react";
import { useRevision } from "./RevisionProvider";
import { revisionLabel, CURRENT_NODE_LABEL } from "./compare";
import { formatRelativeTime } from "./time";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Resizable width — the panel is right-anchored, so drag distance from the
// right edge of the window gives the new width. Persisted so the choice sticks
// across reopens/reloads.
const WIDTH_KEY = "fv-rev-panel-width";
const MIN_WIDTH = 260;
const MAX_WIDTH = 760;
const DEFAULT_WIDTH = 300;

function readStoredWidth(): number {
  if (typeof localStorage === "undefined") return DEFAULT_WIDTH;
  const v = Number(localStorage.getItem(WIDTH_KEY));
  return v >= MIN_WIDTH && v <= MAX_WIDTH ? v : DEFAULT_WIDTH;
}

export function RevisionPanel() {
  const {
    tracked,
    toggleTracked,
    revisions,
    currentContent,
    preview,
    previewRevision,
    diffRevisionInline,
    exitPreview,
    openDiff,
    snapshotNow,
    clearHistory,
    closePanel,
  } = useRevision();

  // Drag-to-resize. widthRef mirrors the latest width so the pointerup handler
  // can persist it without re-binding listeners every render.
  const [width, setWidth] = useState<number>(readStoredWidth);
  const [resizing, setResizing] = useState(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setResizing(true);
    const onMove = (ev: PointerEvent) => {
      const next = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, window.innerWidth - ev.clientX),
      );
      setWidth(next);
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      try {
        localStorage.setItem(WIDTH_KEY, String(Math.round(widthRef.current)));
      } catch {
        /* private mode / storage disabled — width just won't persist */
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  // Snapshot the clock once per render for the relative-time labels (the panel
  // is short-lived; no need for a refresh tick like the always-on bar has).
  const now = Date.now();
  // Newest first for the list. Keep the original index for the "#N" label.
  const rows = revisions.map((r, i) => ({ rev: r, label: revisionLabel(r, i) })).reverse();
  const latest = revisions[revisions.length - 1];
  const liveDiffers = !!currentContent && (!latest || latest.content !== currentContent);

  return (
    <aside
      className={cn(
        "bg-background relative flex h-full flex-col",
        resizing && "select-none",
      )}
      style={{ width }}
    >
      {/* Drag handle — sits on the left edge; drag to resize the panel. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize revision panel"
        title="Drag to resize"
        onPointerDown={startResize}
        onDoubleClick={() => {
          setWidth(DEFAULT_WIDTH);
          try {
            localStorage.setItem(WIDTH_KEY, String(DEFAULT_WIDTH));
          } catch {
            /* ignore */
          }
        }}
        className={cn(
          "absolute left-0 top-0 z-20 h-full w-1.5 -translate-x-1/2 cursor-col-resize touch-none transition-colors",
          resizing ? "bg-primary/40" : "bg-transparent hover:bg-primary/30",
        )}
      />
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
        <History className="size-4" />
        <span className="text-sm font-medium">Revision history</span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto size-7 p-0"
          onClick={closePanel}
          aria-label="Close"
          title="Close"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Revision-mode toggle */}
      <button
        type="button"
        onClick={toggleTracked}
        className={cn(
          "flex items-center gap-2 border-b px-3 py-2 text-left text-xs transition-colors",
          tracked ? "text-foreground" : "text-muted-foreground hover:bg-muted/50",
        )}
      >
        <Power className={cn("size-3.5", tracked && "text-emerald-500")} />
        <span className="font-medium">
          Revision mode {tracked ? "on" : "off"}
        </span>
        <span className="text-muted-foreground ml-auto">
          {tracked ? "click to stop" : "click to start"}
        </span>
      </button>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {!tracked && revisions.length === 0 ? (
          <p className="text-muted-foreground p-3 text-center text-xs">
            Turn on revision mode to start snapshotting this doc as it changes.
          </p>
        ) : revisions.length === 0 ? (
          <p className="text-muted-foreground p-3 text-center text-xs">
            No revisions yet — edit the doc (or hit Snapshot) to capture one.
          </p>
        ) : (
          <ul className="space-y-1">
            {/* Live (current on-screen) state — exits preview back to the doc. */}
            {liveDiffers && (
              <li>
                <RowButton
                  active={preview === null}
                  onClick={exitPreview}
                  title={`${CURRENT_NODE_LABEL} — what's on screen now`}
                  primary={CURRENT_NODE_LABEL}
                  secondary="unsaved on screen"
                />
              </li>
            )}
            {rows.map(({ rev, label }, idx) => {
              const isPreviewing = preview?.id === rev.id;
              // "previous" exists for everything except the very first revision.
              const hasPrev = idx < rows.length - 1;
              return (
                <li key={rev.id} className="group relative">
                  <RowButton
                    active={isPreviewing}
                    onClick={() => previewRevision(rev.id)}
                    title="Click to preview this revision in the main view"
                    primary={label}
                    secondary={formatRelativeTime(rev.capturedAt, now)}
                  />
                  <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
                    {hasPrev && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-6 p-0"
                        onClick={() => diffRevisionInline(rev.id)}
                        title="Diff vs previous revision (inline)"
                        aria-label="Diff vs previous"
                      >
                        <GitCompareArrows className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer actions */}
      {tracked && (
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={snapshotNow}
            title="Capture the current content as a revision now"
          >
            <Camera className="size-3.5" /> Snapshot
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={revisions.length < 1}
            onClick={openDiff}
            title="Open the full-screen compare view"
          >
            <Maximize2 className="size-3.5" /> Full compare
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive ml-auto h-7 gap-1 px-2 text-xs"
            disabled={revisions.length === 0}
            onClick={clearHistory}
            title="Reset history to a fresh baseline of the current content"
          >
            <Trash2 className="size-3.5" /> Clear
          </Button>
        </div>
      )}
    </aside>
  );
}

/** One revision row — a clickable preview target with an active state. */
function RowButton({
  active,
  onClick,
  title,
  primary,
  secondary,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  primary: string;
  secondary: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
        active ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
      )}
    >
      <Eye className={cn("size-3.5 shrink-0", active ? "opacity-100" : "opacity-40")} />
      <span className="font-medium tabular-nums">{primary}</span>
      <span className="text-muted-foreground ml-auto tabular-nums">{secondary}</span>
    </button>
  );
}
