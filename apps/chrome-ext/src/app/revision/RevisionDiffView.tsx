// REVISION MODE — full-screen diff overlay (feature map: revision/RevisionProvider.tsx).
//
// Opened from the revision bar / panel ("Full compare"). Owns the revision
// PICKER (from → to, incl. the live "Current") and the overlay chrome; the diff
// surface itself (Reading/Source lens, Side-by-side/Stacked, Only-changes,
// jump-to-change) is the shared <DiffPane>, so the inline preview and this
// overlay offer the exact same options.
//
// Built as a plain fixed overlay rather than the Base UI Dialog on purpose —
// see CLAUDE.md "Base UI / basecn quirks".
import { useEffect, useMemo, useState } from "react";
import { X, GitCompareArrows } from "lucide-react";
import { useRevision } from "./RevisionProvider";
import { DiffPane } from "./DiffPane";
import { buildDiffNodes, defaultPair, type DiffNode } from "./compare";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RevisionDiffView() {
  const { diffOpen, closeDiff, revisions, currentContent } = useRevision();

  const [oldId, setOldId] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);

  // Comparison nodes (pure logic in compare.ts — unit-tested there).
  const nodes = useMemo<DiffNode[]>(
    () => buildDiffNodes(revisions, currentContent),
    [revisions, currentContent],
  );

  // Seed / re-seed the picker on open or when the node list changes underneath
  // it. Default comparison: the last two nodes ("what just changed").
  useEffect(() => {
    if (!diffOpen) return;
    const pair = defaultPair(nodes);
    if (!pair) return;
    setOldId((cur) => (cur && nodes.some((n) => n.id === cur) ? cur : pair.oldId));
    setNewId((cur) => (cur && nodes.some((n) => n.id === cur) ? cur : pair.newId));
  }, [diffOpen, nodes]);

  // Esc closes.
  useEffect(() => {
    if (!diffOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDiff();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [diffOpen, closeDiff]);

  const oldRev = useMemo(() => nodes.find((n) => n.id === oldId) ?? null, [nodes, oldId]);
  const newRev = useMemo(() => nodes.find((n) => n.id === newId) ?? null, [nodes, newId]);

  if (!diffOpen) return null;

  const picker = (
    <div className="flex items-center gap-1.5">
      <GitCompareArrows className="text-muted-foreground size-4" />
      <RevSelect value={oldId} onChange={setOldId} nodes={nodes} label="from" />
      <span className="text-muted-foreground">→</span>
      <RevSelect value={newId} onChange={setNewId} nodes={nodes} label="to" />
      <span className="bg-border mx-1 h-5 w-px" aria-hidden />
    </div>
  );

  const closeButton = (
    <Button
      variant="ghost"
      size="sm"
      className="ml-auto size-7 p-0"
      onClick={closeDiff}
      aria-label="Close"
      title="Close (Esc)"
    >
      <X className="size-4" />
    </Button>
  );

  return (
    <div className="bg-background fixed inset-0 z-[60] flex flex-col">
      {oldRev && newRev ? (
        <DiffPane
          before={oldRev.content}
          after={newRev.content}
          toolbarStart={picker}
          toolbarEnd={closeButton}
        />
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
            {picker}
            {closeButton}
          </div>
          <div className="text-muted-foreground mx-auto grid max-w-md flex-1 place-items-center text-center text-sm">
            <div>
              <p className="text-foreground mb-1 font-medium">No changes yet</p>
              <p>
                This is the baseline. Edit the file and refresh — or hit{" "}
                <span className="text-foreground font-medium">Snapshot</span> — to capture a new
                revision, then the diff appears here.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A native select over the comparison nodes (stored revisions + live Current,
 *  newest last). Kept native for density + zero Base UI footguns. */
function RevSelect({
  value,
  onChange,
  nodes,
  label,
}: {
  value: string | null;
  onChange: (id: string) => void;
  nodes: DiffNode[];
  label: string;
}) {
  return (
    <select
      aria-label={`Compare ${label} revision`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "border-input bg-background h-7 rounded-md border px-1.5 text-xs",
        "focus:ring-ring outline-none focus:ring-1",
      )}
    >
      {nodes.map((n) => (
        <option key={n.id} value={n.id}>
          {n.label}
        </option>
      ))}
    </select>
  );
}
