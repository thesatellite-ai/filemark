import { TONE_CLASS, type StatusTone } from "@filemark/datagrid";

type DocState = "draft" | "review" | "approved" | "deprecated" | "archived";

const STATE_TONE: Record<DocState, StatusTone> = {
  draft: "muted",
  review: "info",
  approved: "success",
  deprecated: "warn",
  archived: "muted",
};

const STATE_LABEL: Record<DocState, string> = {
  draft: "Draft",
  review: "In review",
  approved: "Approved",
  deprecated: "Deprecated",
  archived: "Archived",
};

/**
 * DocStatus — single-line status chip for any doc.
 *
 *     <DocStatus state="approved" owner="aman" updated="2026-04-24" />
 *
 * Renders a small pill with the state colour, owner avatar/initial,
 * and last-updated date. Designed to sit at the top of a doc; sticks
 * to a single line and wraps gracefully on narrow viewports.
 */
export function DocStatus(props: Record<string, unknown>) {
  const state = normalizeState(props.state ?? props.status);
  const owner = asString(props.owner);
  const updated = asString(props.updated ?? props.date);
  const note = asString(props.note);
  const tone = STATE_TONE[state];

  return (
    <div className="bg-muted/40 my-3 inline-flex flex-wrap items-center gap-2 rounded-md border px-3 py-1.5 text-[12px]">
      <span
        className={[
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
          TONE_CLASS[tone],
        ].join(" ")}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
        {STATE_LABEL[state]}
      </span>
      {owner && (
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <span className="bg-primary/15 text-primary inline-flex size-4 items-center justify-center rounded-full text-[9px] font-semibold uppercase">
            {owner.slice(0, 1)}
          </span>
          {owner}
        </span>
      )}
      {updated && (
        <span className="text-muted-foreground tabular-nums">
          updated {updated}
        </span>
      )}
      {note && <span className="text-muted-foreground italic">{note}</span>}
    </div>
  );
}

function normalizeState(v: unknown): DocState {
  const s = String(v ?? "").trim().toLowerCase();
  if (
    s === "draft" ||
    s === "review" ||
    s === "approved" ||
    s === "deprecated" ||
    s === "archived"
  )
    return s;
  return "draft";
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
