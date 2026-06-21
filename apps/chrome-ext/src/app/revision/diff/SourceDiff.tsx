// REVISION MODE — source diff renderer (feature map: revision/RevisionProvider.tsx).
//
// Renders buildSourceDiff() output as either a STACKED (unified) or
// SIDE-BY-SIDE (split) view. Monospace, red/green line backgrounds, gutter line
// numbers. Pure presentation — the diff math lives in source.ts.
import { useMemo } from "react";
import { buildSourceDiff } from "./source";
import { DIFF_CHANGE_ATTR, SOURCE_DIFF_MODE, type SourceDiffMode } from "../constants";
import { cn } from "@/lib/utils";

// Re-exported so existing importers can keep `import { type SourceDiffMode }
// from "./diff/SourceDiff"` — the canonical definition lives in constants.ts.
export type { SourceDiffMode };

/** data-diff-change marker props for the first row of a changed run (so the
 *  overlay's jump-to-next-change can find it). Spread onto the row element. */
const changeMarker = (isStart: boolean) => (isStart ? { [DIFF_CHANGE_ATTR]: "1" } : {});

interface SourceDiffProps {
  before: string;
  after: string;
  mode: SourceDiffMode;
}

/** Shared cell classes by line role. */
const ADD_BG = "bg-emerald-500/10";
const DEL_BG = "bg-rose-500/10";

/** A blank/absent cell in the split view (one side has no line here). */
const EMPTY_BG = "bg-muted/30";

export function SourceDiff({ before, after, mode }: SourceDiffProps) {
  const diff = useMemo(() => buildSourceDiff(before, after), [before, after]);

  if (!diff.changed) {
    return (
      <div className="text-muted-foreground grid place-items-center p-8 text-sm">
        No changes between these revisions.
      </div>
    );
  }

  if (mode === SOURCE_DIFF_MODE.split) {
    return (
      <div className="overflow-auto font-mono text-xs leading-relaxed">
        {diff.split.map((row, i) => {
          const changed = row.left?.type === "del" || row.right?.type === "add";
          const prev = diff.split[i - 1];
          const prevChanged = prev
            ? prev.left?.type === "del" || prev.right?.type === "add"
            : false;
          return (
          <div key={i} className="grid grid-cols-2" {...changeMarker(changed && !prevChanged)}>
            <Cell
              no={row.left?.no ?? null}
              text={row.left?.text}
              sign={row.left?.type === "del" ? "-" : row.left ? " " : ""}
              className={cn(
                "border-border/50 border-r",
                row.left?.type === "del" && DEL_BG,
                !row.left && EMPTY_BG,
              )}
            />
            <Cell
              no={row.right?.no ?? null}
              text={row.right?.text}
              sign={row.right?.type === "add" ? "+" : row.right ? " " : ""}
              className={cn(row.right?.type === "add" && ADD_BG, !row.right && EMPTY_BG)}
            />
          </div>
          );
        })}
      </div>
    );
  }

  // Unified (stacked).
  return (
    <div className="overflow-auto font-mono text-xs leading-relaxed">
      {diff.unified.map((row, i) => {
        const prev = diff.unified[i - 1];
        const isStart = row.type !== "context" && (!prev || prev.type === "context");
        return (
        <div
          key={i}
          {...changeMarker(isStart)}
          className={cn(
            "flex",
            row.type === "add" && ADD_BG,
            row.type === "del" && DEL_BG,
          )}
        >
          <span className="text-muted-foreground/60 w-10 shrink-0 select-none px-1 text-right tabular-nums">
            {row.oldNo ?? ""}
          </span>
          <span className="text-muted-foreground/60 w-10 shrink-0 select-none px-1 text-right tabular-nums">
            {row.newNo ?? ""}
          </span>
          <span
            className={cn(
              "w-4 shrink-0 select-none text-center",
              row.type === "add" && "text-emerald-600",
              row.type === "del" && "text-rose-600",
            )}
          >
            {row.type === "add" ? "+" : row.type === "del" ? "-" : ""}
          </span>
          <span className="whitespace-pre-wrap break-words">{row.text || " "}</span>
        </div>
        );
      })}
    </div>
  );
}

/** One split-view cell: line-number gutter + sign + text. */
function Cell({
  no,
  text,
  sign,
  className,
}: {
  no: number | null;
  text: string | undefined;
  sign: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0", className)}>
      <span className="text-muted-foreground/60 w-10 shrink-0 select-none px-1 text-right tabular-nums">
        {no ?? ""}
      </span>
      <span className="w-4 shrink-0 select-none text-center">{sign}</span>
      <span className="min-w-0 whitespace-pre-wrap break-words">
        {text === undefined ? "" : text || " "}
      </span>
    </div>
  );
}
