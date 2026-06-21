// REVISION MODE — inline preview (feature map: revision/RevisionProvider.tsx).
//
// Replaces the main viewer with a read-only view of a chosen revision — either
// the revision rendered as-is, or its diff vs the previous revision — without a
// modal. Driven by the panel; stepping between revisions just swaps `preview`.
import { useMemo } from "react";
import { ArrowLeft, BookOpenText, GitCompareArrows } from "lucide-react";
import { useRevision } from "./RevisionProvider";
import { revisionLabel } from "./compare";
import { PREVIEW_MODE } from "./constants";
import { BlockMarkdown } from "./diff/reading/DiffMarkdown";
import { DiffPane } from "./DiffPane";
import { Button } from "@/components/ui/button";

export function RevisionPreview() {
  const {
    revisions,
    preview,
    previewRevision,
    diffRevisionInline,
    exitPreview,
    renderMarkdown,
    diffSettings,
    setDiffSettings,
  } = useRevision();

  const { rev, label, prev } = useMemo(() => {
    if (!preview) return { rev: null, label: "", prev: null };
    const idx = revisions.findIndex((r) => r.id === preview.id);
    return {
      rev: idx >= 0 ? revisions[idx]! : null,
      label: idx >= 0 ? revisionLabel(revisions[idx]!, idx) : "",
      prev: idx > 0 ? revisions[idx - 1]! : null,
    };
  }, [preview, revisions]);

  if (!preview || !rev) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Banner */}
      <div className="bg-amber-500/10 text-foreground flex shrink-0 flex-wrap items-center gap-2 border-b border-amber-500/30 px-3 py-1.5 text-xs">
        <span className="font-medium">Previewing {label}</span>
        <span className="text-muted-foreground">read-only</span>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant={preview.mode === PREVIEW_MODE.render ? "secondary" : "ghost"}
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            onClick={() => previewRevision(rev.id)}
            title="Render this revision"
          >
            <BookOpenText className="size-3.5" />
            <span className="hidden sm:inline">Rendered</span>
          </Button>
          <Button
            variant={preview.mode === PREVIEW_MODE.diff ? "secondary" : "ghost"}
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            disabled={!prev}
            onClick={() => diffRevisionInline(rev.id)}
            title={prev ? "Diff vs the previous revision" : "No previous revision to diff"}
          >
            <GitCompareArrows className="size-3.5" />
            <span className="hidden sm:inline">Diff vs prev</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            onClick={exitPreview}
            title="Back to the live document"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </Button>
        </div>
      </div>

      {/* Body */}
      {preview.mode === PREVIEW_MODE.diff && prev ? (
        // Full diff surface (Reading/Source, Side-by-side/Stacked, Only-changes,
        // jump) — same component the overlay uses.
        <div className="min-h-0 flex-1">
          <DiffPane
            before={prev.content}
            after={rev.content}
            settings={diffSettings}
            onSettingsChange={setDiffSettings}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {renderMarkdown ? (
            // Host's full renderer (MDXViewer) → frontmatter card, callouts,
            // components all render exactly like the live doc.
            renderMarkdown(rev.content)
          ) : (
            // Portable fallback when no host renderer was injected.
            <BlockMarkdown content={rev.content} />
          )}
        </div>
      )}
    </div>
  );
}
