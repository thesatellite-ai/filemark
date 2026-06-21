// REVISION MODE — reading-mode markdown diff (feature map: revision/RevisionProvider.tsx).
//
// Renders the markdown (prose, not raw text) while surfacing WHAT changed, so
// you review only the edited sections instead of re-reading a long doc after an
// AI pass. Ported from aicoder's ReadingDiff; renderer swapped Streamdown →
// Filemark's react-markdown (DiffMarkdown). Diff math is pure jsdiff (blocks.ts
// + diffWords).
//
// Two granularities:
//   1. Block level — split before/after into fence-aware blocks, LCS-pair them.
//      Pure add/remove blocks render green/red.
//   2. Intra-block — a removed block immediately followed by an added one is a
//      MODIFIED pair; we diff inside it:
//        • GFM tables   → structured cell diff (only changed cells light up).
//        • prose/heading → word-level diff (diffWords) with ins/del.
//        • code/list/mismatched → whole-block before+after (safer than mangling
//          structured content).
import { useMemo } from "react";
import { diffWords } from "diff";
import { BlockMarkdown, CellMarkdown } from "./DiffMarkdown";
import { blockKind, pairDiff, parseTable, splitBlocks, type PairUnit } from "./blocks";
import { DIFF_CHANGE_ATTR, INTRA_BLOCK_DIFF_MAX_CHARS } from "../../constants";
import { cn } from "@/lib/utils";

/** True when a modified block pair is too large for the O(n·m) word/cell diff —
 *  the renderer then falls back to a whole-block before+after view. */
function tooLargeForIntraDiff(a: string, b: string): boolean {
  return a.length + b.length > INTRA_BLOCK_DIFF_MAX_CHARS;
}

/** Whole-block before (removed) + after (added) — the safe fallback for code,
 *  lists, mismatched kinds, and oversized modified pairs. */
function WholeBlockPair({ a, b }: { a: string; b: string }) {
  return (
    <>
      <div className="rounded-r border-l-2 border-rose-500 bg-rose-500/[0.06] pl-3 pr-2 opacity-75">
        <Tag tone="del" />
        <BlockMarkdown content={a} />
      </div>
      <div className="rounded-r border-l-2 border-emerald-500 bg-emerald-500/[0.06] pl-3 pr-2">
        <Tag tone="add" />
        <BlockMarkdown content={b} />
      </div>
    </>
  );
}

// ───────────────────────── intra-block renderers ─────────────────────────

/** Word-level diff for a prose / heading pair. */
function WordDiff({ before, after }: { before: string; after: string }) {
  const parts = useMemo(() => diffWords(before, after), [before, after]);
  return (
    <p className="whitespace-pre-wrap text-[0.92em] leading-relaxed">
      {parts.map((p, i) =>
        p.added ? (
          <ins
            key={i}
            className="rounded bg-emerald-500/15 text-emerald-700 no-underline dark:text-emerald-300"
          >
            {p.value}
          </ins>
        ) : p.removed ? (
          <del
            key={i}
            className="rounded bg-rose-500/15 text-rose-700 line-through dark:text-rose-300"
          >
            {p.value}
          </del>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </p>
  );
}

/** Structured table diff — one table, only the changed cells light up. */
function TableDiff({ before, after }: { before: string; after: string }) {
  const o = parseTable(before);
  const n = parseTable(after);
  const cols = Math.max(o.header.length, n.header.length);
  const rowUnits = pairDiff(o.rows, n.rows, (r) => r.join(""));

  const cell = (
    k: number,
    oldText: string | undefined,
    newText: string | undefined,
    mode: "same" | "add" | "del" | "mod",
    head: boolean,
  ) => {
    const Tag = head ? "th" : "td";
    const base = "border border-border px-3 py-1.5 align-top text-left";
    if (mode === "add")
      return (
        <Tag key={k} className={cn(base, "bg-emerald-500/[0.08]")}>
          <CellMarkdown content={newText ?? ""} />
        </Tag>
      );
    if (mode === "del")
      return (
        <Tag key={k} className={cn(base, "bg-rose-500/[0.08] opacity-70")}>
          <div className="line-through">
            <CellMarkdown content={oldText ?? ""} />
          </div>
        </Tag>
      );
    if (mode === "mod")
      return (
        <Tag key={k} className={cn(base, "bg-amber-500/[0.1]")}>
          <div className="mb-0.5 rounded bg-rose-500/10 px-1 line-through opacity-70">
            <CellMarkdown content={oldText ?? ""} />
          </div>
          <div className="rounded bg-emerald-500/10 px-1">
            <CellMarkdown content={newText ?? ""} />
          </div>
        </Tag>
      );
    return (
      <Tag key={k} className={base}>
        <CellMarkdown content={newText ?? oldText ?? ""} />
      </Tag>
    );
  };

  return (
    <div className="border-border overflow-x-auto rounded border">
      <table className="w-full border-collapse text-[13px]">
        <thead className="bg-muted/40">
          <tr>
            {Array.from({ length: cols }).map((_, c) =>
              cell(
                c,
                o.header[c],
                n.header[c],
                (o.header[c] ?? "") === (n.header[c] ?? "") ? "same" : "mod",
                true,
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rowUnits.map((u, ri) => (
            <tr key={ri}>
              {Array.from({ length: cols }).map((_, c) => {
                if (u.kind === "add") return cell(c, undefined, u.b[c], "add", false);
                if (u.kind === "del") return cell(c, u.a[c], undefined, "del", false);
                if (u.kind === "mod") {
                  const same = (u.a[c] ?? "") === (u.b[c] ?? "");
                  return cell(c, u.a[c], u.b[c], same ? "same" : "mod", false);
                }
                return cell(c, u.a[c], u.b[c], "same", false);
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ───────────────────────── change tag chip ─────────────────────────

function Tag({ tone }: { tone: "add" | "del" | "mod" }) {
  const map = {
    add: { t: "+ added", c: "text-emerald-600 dark:text-emerald-400" },
    del: { t: "− removed", c: "text-rose-600 dark:text-rose-400" },
    mod: { t: "~ changed", c: "text-amber-600 dark:text-amber-400" },
  } as const;
  return (
    <div className={cn("mt-1 font-mono text-[9px] uppercase tracking-wide", map[tone].c)}>
      {map[tone].t}
    </div>
  );
}

// ───────────────────────── per-unit view ─────────────────────────

function UnitView({ unit }: { unit: PairUnit<string> }) {
  if (unit.kind === "same") {
    return (
      <div className="border-l-2 border-transparent pl-3 pr-2">
        <BlockMarkdown content={unit.b} />
      </div>
    );
  }
  if (unit.kind === "add") {
    return (
      <div className="rounded-r border-l-2 border-emerald-500 bg-emerald-500/[0.06] pl-3 pr-2">
        <Tag tone="add" />
        <BlockMarkdown content={unit.b} />
      </div>
    );
  }
  if (unit.kind === "del") {
    return (
      <div className="rounded-r border-l-2 border-rose-500 bg-rose-500/[0.06] pl-3 pr-2 opacity-75">
        <Tag tone="del" />
        <BlockMarkdown content={unit.a} />
      </div>
    );
  }
  // modified pair — diff inside it (unless it's too big for the O(n·m) pass).
  const ka = blockKind(unit.a);
  const kb = blockKind(unit.b);
  if (tooLargeForIntraDiff(unit.a, unit.b)) {
    return <WholeBlockPair a={unit.a} b={unit.b} />;
  }
  if (ka === "table" && kb === "table") {
    return (
      <div className="rounded-r border-l-2 border-amber-500 bg-amber-500/[0.04] pl-3 pr-2">
        <Tag tone="mod" />
        <TableDiff before={unit.a} after={unit.b} />
      </div>
    );
  }
  if ((ka === "prose" || ka === "heading") && (kb === "prose" || kb === "heading")) {
    return (
      <div className="rounded-r border-l-2 border-amber-500 bg-amber-500/[0.04] pl-3 pr-2">
        <Tag tone="mod" />
        <WordDiff before={unit.a} after={unit.b} />
      </div>
    );
  }
  // mismatched / code / list pair — safest to show whole-block before+after.
  return <WholeBlockPair a={unit.a} b={unit.b} />;
}

// ───────────────────────── top-level ─────────────────────────

export function ReadingDiff({
  before,
  after,
  onlyChanges,
}: {
  before: string;
  after: string;
  /** Hide unchanged blocks, leaving only the edited sections + a marker. */
  onlyChanges: boolean;
}) {
  const units = useMemo(
    () => pairDiff(splitBlocks(before), splitBlocks(after), (b) => b),
    [before, after],
  );

  const changedCount = units.filter((u) => u.kind !== "same").length;

  // Collapse runs of unchanged blocks into a marker when onlyChanges is on.
  type Rendered =
    | { unit: PairUnit<string>; key: string }
    | { collapsed: number; key: string };
  const items: Rendered[] = [];
  let pendingSame = 0;
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    if (onlyChanges && u.kind === "same") {
      pendingSame++;
      continue;
    }
    if (pendingSame > 0) {
      items.push({ collapsed: pendingSame, key: `gap-${items.length}` });
      pendingSame = 0;
    }
    items.push({ unit: u, key: `u-${i}` });
  }
  if (pendingSame > 0) items.push({ collapsed: pendingSame, key: `gap-${items.length}` });

  if (changedCount === 0) {
    return (
      <div className="text-muted-foreground px-3 py-2 text-[12px]">
        No block-level changes — the edits are whitespace-only.
      </div>
    );
  }

  return (
    <div className="space-y-2 px-1 py-2">
      {items.map((it) => {
        if ("collapsed" in it) {
          return (
            <div
              key={it.key}
              className="text-muted-foreground/70 my-1 flex items-center gap-2 text-[10px] uppercase tracking-wide"
            >
              <span className="bg-border h-px flex-1" />
              {it.collapsed} unchanged {it.collapsed === 1 ? "block" : "blocks"}
              <span className="bg-border h-px flex-1" />
            </div>
          );
        }
        // Wrap each changed unit in a marker so the overlay's jump-to-next-
        // change can find it.
        return (
          <div key={it.key} {...{ [DIFF_CHANGE_ATTR]: "1" }}>
            <UnitView unit={it.unit} />
          </div>
        );
      })}
    </div>
  );
}
