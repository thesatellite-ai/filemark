// REVISION MODE — shared diff pane (feature map: revision/RevisionProvider.tsx).
//
// The full diff surface — Reading vs Source (raw markdown) lens, Side-by-side /
// Stacked for source, Only-changes for reading, and jump-to-next-change — used
// by BOTH the full-screen overlay (RevisionDiffView) and the inline preview
// (RevisionPreview). Single implementation so the two never drift and the
// inline diff has every option the overlay does. `toolbarStart` / `toolbarEnd`
// let each host inject its own chrome (the overlay's revision picker + close).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Rows3, Columns2, BookOpenText, FileCode2, ChevronUp, ChevronDown } from "lucide-react";
import { SourceDiff } from "./diff/SourceDiff";
import { ReadingDiff } from "./diff/reading/ReadingDiff";
import {
  DIFF_CHANGE_ATTR,
  DIFF_VIEW,
  SOURCE_DIFF_MODE,
  type DiffView,
  type SourceDiffMode,
} from "./constants";
import { Button } from "@/components/ui/button";

interface DiffPaneProps {
  before: string;
  after: string;
  /** Controls rendered at the start of the toolbar (e.g. the overlay's picker). */
  toolbarStart?: ReactNode;
  /** Controls rendered at the end of the toolbar (e.g. the overlay's close button). */
  toolbarEnd?: ReactNode;
}

export function DiffPane({ before, after, toolbarStart, toolbarEnd }: DiffPaneProps) {
  const [view, setView] = useState<DiffView>(DIFF_VIEW.reading);
  const [mode, setMode] = useState<SourceDiffMode>(SOURCE_DIFF_MODE.split);
  // Reading diff hides unchanged blocks by default — the whole point is to
  // review only what changed.
  const [onlyChanges, setOnlyChanges] = useState(true);

  // Jump-to-next-change: each changed block/hunk is tagged `data-diff-change`.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [changeIdx, setChangeIdx] = useState(0);
  const [changeCount, setChangeCount] = useState(0);

  // Recount markers after each (re)render of the body — the diff shape changes
  // with the lens, sub-mode, and the compared content.
  useEffect(() => {
    setChangeIdx(0);
    const root = bodyRef.current;
    setChangeCount(root ? root.querySelectorAll(`[${DIFF_CHANGE_ATTR}]`).length : 0);
  }, [view, mode, onlyChanges, before, after]);

  const jumpChange = (dir: 1 | -1) => {
    const root = bodyRef.current;
    if (!root) return;
    const marks = Array.from(root.querySelectorAll<HTMLElement>(`[${DIFF_CHANGE_ATTR}]`));
    if (!marks.length) return;
    let next = changeIdx + dir;
    if (next < 0) next = marks.length - 1;
    if (next >= marks.length) next = 0;
    marks[next]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setChangeIdx(next);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b px-3 py-1.5 text-xs">
        {toolbarStart}

        {/* Reading vs Source lens. */}
        <Button
          variant={view === DIFF_VIEW.reading ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => setView(DIFF_VIEW.reading)}
          title="Reading diff — rendered markdown"
        >
          <BookOpenText className="size-3.5" />
          <span className="hidden sm:inline">Reading</span>
        </Button>
        <Button
          variant={view === DIFF_VIEW.source ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => setView(DIFF_VIEW.source)}
          title="Source diff — raw markdown lines"
        >
          <FileCode2 className="size-3.5" />
          <span className="hidden sm:inline">Source</span>
        </Button>

        <span className="bg-border mx-1 h-5 w-px" aria-hidden />

        {/* Per-lens sub-toggles. */}
        {view === DIFF_VIEW.source ? (
          <>
            <Button
              variant={mode === SOURCE_DIFF_MODE.split ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setMode(SOURCE_DIFF_MODE.split)}
              title="Side-by-side"
            >
              <Columns2 className="size-3.5" />
              <span className="hidden sm:inline">Side-by-side</span>
            </Button>
            <Button
              variant={mode === SOURCE_DIFF_MODE.unified ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setMode(SOURCE_DIFF_MODE.unified)}
              title="Stacked"
            >
              <Rows3 className="size-3.5" />
              <span className="hidden sm:inline">Stacked</span>
            </Button>
          </>
        ) : (
          <Button
            variant={onlyChanges ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setOnlyChanges((v) => !v)}
            title="Collapse unchanged sections"
          >
            <span className="hidden sm:inline">Only changes</span>
            <span className="sm:hidden">Changes</span>
          </Button>
        )}

        <span className="bg-border mx-1 h-5 w-px" aria-hidden />

        {/* Jump between changes. */}
        <span className="text-muted-foreground hidden tabular-nums sm:inline">
          {changeCount} change{changeCount === 1 ? "" : "s"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0"
          disabled={changeCount === 0}
          onClick={() => jumpChange(-1)}
          aria-label="Previous change"
          title="Previous change"
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0"
          disabled={changeCount === 0}
          onClick={() => jumpChange(1)}
          aria-label="Next change"
          title="Next change"
        >
          <ChevronDown className="size-4" />
        </Button>

        {toolbarEnd}
      </div>

      {/* Body */}
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-auto px-3 py-2">
        {view === DIFF_VIEW.reading ? (
          <ReadingDiff before={before} after={after} onlyChanges={onlyChanges} />
        ) : (
          <SourceDiff before={before} after={after} mode={mode} />
        )}
      </div>
    </div>
  );
}
