// REVISION MODE — in-viewer status bar (feature map: revision/RevisionProvider.tsx).
//
// A slim strip shown above the viewer when the active doc is in revision mode:
// revision count + when it last changed, a "changed" pulse right after a new
// capture, and the manual actions (snapshot / clear). The "View changes" diff
// trigger lands in Phase 3.
import { History, Camera, Trash2, GitCompareArrows } from "lucide-react";
import { useEffect, useState } from "react";
import { useRevision } from "./RevisionProvider";
import { formatRelativeTime } from "./time";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** How often the relative-time label refreshes while the doc sits open (ms). */
const TIME_REFRESH_MS = 30_000;

export function RevisionBar() {
  const {
    tracked,
    revisions,
    lastChangedAt,
    justCaptured,
    snapshotNow,
    clearHistory,
    togglePanel,
  } = useRevision();

  // Tick once a minute so the relative time label doesn't go stale while the
  // doc sits open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!tracked) return;
    const id = window.setInterval(() => setNow(Date.now()), TIME_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [tracked]);

  if (!tracked) return null;

  const count = revisions.length;

  return (
    <div className="bg-muted/40 text-muted-foreground flex h-8 shrink-0 items-center gap-2 border-b px-3 text-xs">
      <History className="size-3.5 shrink-0" />
      <span className="text-foreground font-medium">Revision mode</span>
      <span aria-hidden>·</span>
      <span className="tabular-nums">
        {count === 0
          ? "no revisions yet"
          : `${count} revision${count === 1 ? "" : "s"}`}
      </span>
      {lastChangedAt != null && (
        <>
          <span aria-hidden>·</span>
          <span
            className={cn(
              "tabular-nums transition-colors",
              justCaptured && "text-emerald-500 font-medium",
            )}
          >
            {justCaptured ? "changed " : "updated "}
            {formatRelativeTime(lastChangedAt, now)}
          </span>
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={snapshotNow}
          title="Capture the current content as a revision now"
        >
          <Camera className="size-3.5" />
          <span className="hidden sm:inline">Snapshot</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={togglePanel}
          title="Open revision history — browse + preview past versions"
        >
          <GitCompareArrows className="size-3.5" />
          <span className="hidden sm:inline">History</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive h-6 gap-1 px-2 text-xs"
          disabled={count === 0}
          onClick={clearHistory}
          title="Delete all captured revisions for this doc"
        >
          <Trash2 className="size-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
      </div>
    </div>
  );
}
