import type { ReactNode } from "react";

/**
 * Define — single-doc glossary entry.
 *
 *     <Define term="filemark">A reader-first markdown renderer for
 *     Chrome that treats every doc as part of a library.</Define>
 *
 * Renders the definition inline AS-IS. The matching `<abbr>` decoration on
 * later occurrences of the term is performed by the `rehypeGlossary`
 * rehype plugin at hast-build time, so React owns the resulting DOM and
 * cannot race a manual DOM walker on subsequent reconciles.
 */
export function Define(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const term = asString(props.term);
  return (
    <span className="fv-define">
      <strong>{term}</strong>
      {": "}
      {props.children}
    </span>
  );
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
