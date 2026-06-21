// REVISION MODE — history side panel (feature map: revision/RevisionProvider.tsx).
//
// Right-rail list of revisions for quick browsing: click a row to load that
// revision read-only into the MAIN viewer (inline preview, no modal); step
// through by clicking different rows. Per-row "Diff vs previous" shows the
// reading-diff inline. Also hosts the revision-mode toggle + Snapshot / Clear /
// Full-compare. Mirrors the NotesPanel layout.
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

  // Snapshot the clock once per render for the relative-time labels (the panel
  // is short-lived; no need for a refresh tick like the always-on bar has).
  const now = Date.now();
  // Newest first for the list. Keep the original index for the "#N" label.
  const rows = revisions.map((r, i) => ({ rev: r, label: revisionLabel(r, i) })).reverse();
  const latest = revisions[revisions.length - 1];
  const liveDiffers = !!currentContent && (!latest || latest.content !== currentContent);

  return (
    <aside className="bg-background flex h-full w-[300px] flex-col">
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
