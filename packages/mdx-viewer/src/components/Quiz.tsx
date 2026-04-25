import { useState, type ReactNode } from "react";
import { collectMarkers, isMarker } from "./markerWalk";

/**
 * Quiz — multi-choice question with reveal-on-pick.
 *
 *     <Quiz question="What does `colorFreezeLevel: 2` do in markmap?">
 *
 *     <Choice>Limits the colour palette to 2 distinct hues.</Choice>
 *     <Choice correct>Stops the per-depth colour cycle at depth 2 — descendants inherit the parent colour.</Choice>
 *     <Choice>Freezes the entire mindmap so it can't be panned.</Choice>
 *
 *     </Quiz>
 *
 * Mark the right answer with `correct`. Click any choice to reveal —
 * correct lights green, incorrect picks light red, the rest reveal
 * the right answer in green.
 */
export function Quiz(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const question = asString(props.question);
  const choices = collectMarkers(
    props.children,
    isMarker("Choice", "choice")
  ).map((el) => {
    const p = el.props as Record<string, unknown>;
    return {
      correct: p.correct !== undefined && p.correct !== false,
      body: (p as { children?: ReactNode }).children,
    };
  });
  const [picked, setPicked] = useState<number | null>(null);

  if (choices.length === 0) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>Quiz</strong> — needs `&lt;Choice&gt;` children.
      </div>
    );
  }

  return (
    <section className="bg-card my-6 rounded-lg border p-4 shadow-sm">
      {question && (
        <header className="mb-3">
          <div className="text-primary mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
            Quiz
          </div>
          <div className="text-foreground text-[14px] font-semibold leading-snug">
            {question}
          </div>
        </header>
      )}
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {choices.map((c, i) => {
          const isPicked = picked === i;
          const revealed = picked !== null;
          const tone = revealed
            ? c.correct
              ? "border-emerald-500 bg-emerald-500/10"
              : isPicked
                ? "border-rose-500 bg-rose-500/10"
                : "border-border bg-muted/20"
            : "border-border bg-card hover:bg-muted/40";
          const icon = revealed ? (c.correct ? "✓" : isPicked ? "✗" : "○") : null;
          return (
            <li key={i} className="m-0 p-0">
              <button
                type="button"
                disabled={revealed}
                onClick={() => setPicked(i)}
                className={[
                  "flex w-full items-start gap-2 rounded-md border-2 p-3 text-left text-sm transition-colors",
                  tone,
                  revealed ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
              >
                {icon ? (
                  <span
                    className={[
                      "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      c.correct
                        ? "bg-emerald-500 text-white"
                        : isPicked
                          ? "bg-rose-500 text-white"
                          : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {icon}
                  </span>
                ) : (
                  <span className="border-muted-foreground mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold tabular-nums text-muted-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                )}
                <span className="flex-1">{c.body}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {picked !== null && (
        <button
          type="button"
          onClick={() => setPicked(null)}
          className="text-muted-foreground hover:text-foreground mt-3 text-[11px] underline"
        >
          ↻ try again
        </button>
      )}
    </section>
  );
}

export function Choice(_p: Record<string, unknown>) {
  return null;
}
Choice.displayName = "Choice";

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
