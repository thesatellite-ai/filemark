import type { ReactNode } from "react";

type CalloutType = "note" | "tip" | "warning" | "danger" | "info";

const STYLES: Record<CalloutType, { label: string; cls: string }> = {
  note: { label: "Note", cls: "fv-callout-note" },
  tip: { label: "Tip", cls: "fv-callout-tip" },
  info: { label: "Info", cls: "fv-callout-info" },
  warning: { label: "Warning", cls: "fv-callout-warning" },
  danger: { label: "Danger", cls: "fv-callout-danger" },
};

export function Callout({
  type = "note",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children?: ReactNode;
}) {
  const s = STYLES[type] ?? STYLES.note;
  return (
    <aside className={`fv-callout ${s.cls}`}>
      <div className="fv-callout-title">{title ?? s.label}</div>
      <div className="fv-callout-body">{children}</div>
    </aside>
  );
}
