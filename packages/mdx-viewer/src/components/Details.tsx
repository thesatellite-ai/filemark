import type { ReactNode } from "react";

export function Details({
  summary,
  children,
  open,
}: {
  summary: string;
  children?: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="fv-details" open={open}>
      <summary className="fv-details-summary">{summary}</summary>
      <div className="fv-details-body">{children}</div>
    </details>
  );
}
