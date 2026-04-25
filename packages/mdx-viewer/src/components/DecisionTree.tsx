import { useState, type ReactNode } from "react";
import { collectMarkers, isMarker } from "./markerWalk";

/**
 * DecisionTree — recursive branching analysis.
 *
 *     <DecisionTree question="Should we migrate?">
 *
 *     <Branch label="yes">
 *
 *     <DecisionTree question="Big-bang or incremental?">
 *
 *     <Branch label="big-bang">Risky but fast.</Branch>
 *     <Branch label="incremental">Safer, takes a quarter.</Branch>
 *
 *     </DecisionTree>
 *
 *     </Branch>
 *
 *     <Branch label="no">Stay on current platform; revisit Q4.</Branch>
 *
 *     </DecisionTree>
 *
 * Each node renders a question card; branches expand horizontally
 * with their label as an edge ribbon. Branches can be plain text or
 * contain another `<DecisionTree>` for recursive depth.
 */
export function DecisionTree(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const question = asString(props.question);
  // Walker descends through <p> wrappers + parser-induced nesting, but
  // stops at any nested <DecisionTree> so an outer instance doesn't
  // claim the inner's branches.
  const branches = collectMarkers(
    props.children,
    isMarker("Branch", "branch"),
    { stopAt: isMarker("DecisionTree", "decisiontree") }
  ).map((el) => {
    const p = el.props as Record<string, unknown>;
    return {
      label: asString(p.label) || "—",
      children: (p as { children?: ReactNode }).children,
    };
  });

  return (
    <div className="fv-decisiontree my-3 inline-flex flex-col items-start">
      <div className="bg-primary/10 border-primary/30 mb-2 rounded-md border-2 px-3 py-2 text-[13px] font-semibold">
        ?
        <span className="ml-1.5">{question}</span>
      </div>
      {branches.length > 0 && (
        <div className="ml-4 flex flex-col gap-3 border-l-2 border-dashed border-current/30 pl-4">
          {branches.map((b, i) => (
            <BranchNode key={i} label={b.label}>
              {b.children}
            </BranchNode>
          ))}
        </div>
      )}
    </div>
  );
}

function BranchNode({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex flex-col items-start">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="bg-card hover:bg-muted/60 mb-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors"
      >
        <span
          className={[
            "text-muted-foreground inline-block w-2.5 text-[10px] transition-transform",
            open ? "rotate-90" : "",
          ].join(" ")}
          aria-hidden
        >
          ▶
        </span>
        {label}
      </button>
      {open && <div className="pl-4">{children}</div>}
    </div>
  );
}

export function Branch(_p: Record<string, unknown>) {
  return null;
}
Branch.displayName = "Branch";

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
