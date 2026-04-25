import type { ReactNode } from "react";
import { collectMarkers, isMarker } from "./markerWalk";

/**
 * WeightedScore — options × weighted criteria → ranked decision matrix.
 *
 *     <WeightedScore>
 *
 *     <Criterion name="Effort"  weight="2" />
 *     <Criterion name="Impact"  weight="3" />
 *     <Criterion name="Risk"    weight="1" inverse />
 *
 *     <Option name="Refactor parser"  scores="3,4,2" />
 *     <Option name="Cache layer"      scores="4,3,3" />
 *     <Option name="Rewrite from 0"   scores="1,5,5" />
 *
 *     </WeightedScore>
 *
 * Each option's score = Σ (criterionScore[i] × weight[i]) with the
 * `inverse` criterion contributing `(maxScore − criterionScore[i]) × weight`
 * so "lower is better" works out cleanly. Highest total wins; row gets
 * a primary border + 🏆.
 *
 * Scores are 1–5 by default (configurable via `scale=`). Pass scores
 * as a comma-separated list aligned with criterion order.
 */
export function WeightedScore(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const scale = numOrDefault(props.scale, 5);
  const title = asString(props.title);

  // Walk all descendants — HTML5 parser nests sibling self-closing
  // markers (`<Criterion />`, `<Option />`) into each other since `/>`
  // is ignored on custom elements. See markerWalk.ts for context.
  const criteria: Criterion[] = collectMarkers(
    props.children,
    isMarker("Criterion", "criterion")
  ).map((el) => {
    const p = el.props as Record<string, unknown>;
    return {
      name: asString(p.name),
      weight: numOrDefault(p.weight, 1),
      inverse: p.inverse !== undefined && p.inverse !== false,
    };
  });

  const options: Option[] = collectMarkers(
    props.children,
    isMarker("Option", "option")
  ).map((el) => {
    const p = el.props as Record<string, unknown>;
    return {
      name: asString(p.name),
      scores: parseScores(asString(p.scores)),
      note: asString(p.note),
    };
  });

  const ranked = options.map((o) => ({
    ...o,
    total: scoreOf(o.scores, criteria, scale),
  }));
  ranked.sort((a, b) => b.total - a.total);
  const max = ranked[0]?.total ?? 0;

  return (
    <section className="bg-card my-6 overflow-hidden rounded-lg border shadow-sm">
      <header className="border-b p-4">
        <div className="text-primary mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
          Weighted score
        </div>
        {title && (
          <h3 className="text-foreground mt-0 mb-0 text-base leading-tight font-semibold">
            {title}
          </h3>
        )}
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide">
                Option
              </th>
              {criteria.map((c, i) => (
                <th
                  key={i}
                  className="text-muted-foreground px-3 py-2 text-center text-[11px] font-medium"
                >
                  {c.name}
                  <span className="text-muted-foreground ml-1 text-[10px]">
                    ×{c.weight}
                    {c.inverse ? " ⇣" : ""}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((o, ri) => {
              const isWinner = o.total === max && max > 0;
              return (
                <tr
                  key={ri}
                  className={
                    isWinner
                      ? "border-primary/30 bg-primary/5 border-l-4"
                      : "border-l-4 border-transparent"
                  }
                >
                  <td className="px-3 py-2 font-medium">
                    {isWinner && <span className="mr-1.5">🏆</span>}
                    {o.name}
                    {o.note && (
                      <div className="text-muted-foreground text-[11px] italic">
                        {o.note}
                      </div>
                    )}
                  </td>
                  {criteria.map((_, ci) => {
                    const s = o.scores[ci] ?? 0;
                    return (
                      <td
                        key={ci}
                        className="text-foreground px-3 py-2 text-center tabular-nums"
                      >
                        {s || "—"}
                      </td>
                    );
                  })}
                  <td className="text-foreground px-3 py-2 text-right text-[15px] font-bold tabular-nums">
                    {o.total.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface Criterion {
  name: string;
  weight: number;
  inverse: boolean;
}

interface Option {
  name: string;
  scores: number[];
  note: string;
}

// Marker components — no own render, parent reads their props.
export function Criterion(_p: Record<string, unknown>) {
  return null;
}
Criterion.displayName = "Criterion";

export function Option(_p: Record<string, unknown>) {
  return null;
}
Option.displayName = "Option";

function scoreOf(
  scores: number[],
  criteria: Criterion[],
  scale: number
): number {
  let total = 0;
  for (let i = 0; i < criteria.length; i++) {
    const s = scores[i] ?? 0;
    const effective = criteria[i].inverse ? scale + 1 - s : s;
    total += effective * criteria[i].weight;
  }
  return total;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function numOrDefault(v: unknown, fallback: number): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function parseScores(s: string): number[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => !Number.isNaN(n));
}
