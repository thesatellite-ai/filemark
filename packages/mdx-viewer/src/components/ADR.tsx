import type { ReactNode } from "react";
import { TONE_CLASS, type StatusTone } from "@filemark/datagrid";

type AdrStatus =
  | "proposed"
  | "accepted"
  | "rejected"
  | "deprecated"
  | "superseded";

const STATUS_TONE: Record<AdrStatus, StatusTone> = {
  proposed: "info",
  accepted: "success",
  rejected: "danger",
  deprecated: "muted",
  superseded: "warn",
};

const STATUS_LABEL: Record<AdrStatus, string> = {
  proposed: "Proposed",
  accepted: "Accepted",
  rejected: "Rejected",
  deprecated: "Deprecated",
  superseded: "Superseded",
};

export function ADR(props: Record<string, unknown> & { children?: ReactNode }) {
  const status = normalizeStatus(props.status);
  const id = asString(props.id);
  const date = asString(props.date);
  const title = asString(props.title);
  const supersedes = asString(props.supersedes);
  const supersededBy = asString(props["superseded-by"] ?? props.supersededBy);
  const tone = STATUS_TONE[status];

  return (
    <section className="bg-card my-6 rounded-lg border p-5 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center gap-2 border-b pb-3">
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
            TONE_CLASS[tone],
          ].join(" ")}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
          {STATUS_LABEL[status]}
        </span>
        {id && (
          <code className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[11px]">
            {id}
          </code>
        )}
        {date && (
          <span className="text-muted-foreground text-xs tabular-nums">
            {date}
          </span>
        )}
        {(supersedes || supersededBy) && (
          <span className="text-muted-foreground ml-auto flex flex-wrap items-center gap-2 text-xs">
            {supersedes && (
              <span>
                supersedes <AdrRef id={supersedes} />
              </span>
            )}
            {supersededBy && (
              <span>
                superseded by <AdrRef id={supersededBy} />
              </span>
            )}
          </span>
        )}
      </header>
      {title && (
        <h3 className="text-foreground mt-0 mb-3 text-lg leading-snug font-semibold">
          {title}
        </h3>
      )}
      <div className="fv-adr-body text-sm leading-relaxed">{props.children}</div>
    </section>
  );
}

function AdrRef({ id }: { id: string }) {
  return (
    <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">
      {id}
    </code>
  );
}

function normalizeStatus(v: unknown): AdrStatus {
  const s = String(v ?? "").trim().toLowerCase();
  if (
    s === "proposed" ||
    s === "accepted" ||
    s === "rejected" ||
    s === "deprecated" ||
    s === "superseded"
  )
    return s;
  return "proposed";
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
