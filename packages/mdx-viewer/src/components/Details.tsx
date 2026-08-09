import type { ReactNode } from "react";

/**
 * Collapsible section. Handles TWO shapes because this component is mapped to the
 * native `<details>` tag AND used as a filemark component:
 *
 *   • Native GFM — `<details><summary>…</summary>…</details>` — the summary and
 *     body already arrive as children (rehype-raw nests them). We render children
 *     verbatim so the browser's native <summary> toggle works. Passing a `summary`
 *     prop here would produce an EMPTY extra <summary> (a bare ▶ with no label) and
 *     bury the real one — the bug this branch fixes.
 *   • Filemark — `<Details summary="…">…</Details>` — summary comes as a prop, so
 *     we build the summary + body wrapper ourselves.
 *
 * The distinguisher is whether `summary` is a string prop (filemark) or absent
 * (native, where the summary is a child <summary> element instead).
 */
export function Details({
  summary,
  children,
  open,
}: {
  summary?: string;
  children?: ReactNode;
  open?: boolean;
}) {
  if (summary === undefined) {
    return (
      <details className="fv-details" open={open}>
        {children}
      </details>
    );
  }
  return (
    <details className="fv-details" open={open}>
      <summary className="fv-details-summary">{summary}</summary>
      <div className="fv-details-body">{children}</div>
    </details>
  );
}
