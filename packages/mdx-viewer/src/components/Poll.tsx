import { useEffect, useState, type ReactNode } from "react";
import { collectMarkers, isMarker } from "./markerWalk";

/**
 * Poll — single-question vote, persisted to localStorage by id.
 *
 *     <Poll id="favorite-tier" question="Which tier excites you most?">
 *
 *     <PollOption>Tier 1 — templates + cards</PollOption>
 *     <PollOption>Tier 2 — heatmap, annotated images</PollOption>
 *     <PollOption>Tier 3 — quizzes, polls, GitHub cards</PollOption>
 *
 *     </Poll>
 *
 * Persisted per-user via localStorage at `filemark:poll:<id>`. Counts
 * are LOCAL ONLY (no server) — this is for personal voting / decision
 * surfaces, not for cross-user aggregation.
 */
export function Poll(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const id = asString(props.id) || "default";
  const question = asString(props.question);
  const options = collectMarkers(
    props.children,
    isMarker("PollOption", "polloption")
  ).map((el) => ({
    body: (el.props as { children?: ReactNode }).children,
    text: collectText((el.props as { children?: ReactNode }).children),
  }));

  const storageKey = `filemark:poll:${id}`;
  const [counts, setCounts] = useState<number[]>(() =>
    options.map(() => 0)
  );
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { counts: number[]; picked?: number };
        if (Array.isArray(parsed.counts)) {
          // Pad/trim to match current option count.
          const arr = options.map((_, i) => parsed.counts[i] ?? 0);
          setCounts(arr);
        }
        if (typeof parsed.picked === "number") setPicked(parsed.picked);
      } catch {
        /* ignore */
      }
    }
    // We intentionally don't depend on `options` since the count length
    // is set once at mount; new options added after mount will reset
    // counts to 0 which is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const vote = (i: number) => {
    if (picked !== null) return;
    const next = counts.slice();
    next[i] = (next[i] ?? 0) + 1;
    setCounts(next);
    setPicked(i);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify({ counts: next, picked: i }));
    }
  };

  if (options.length === 0) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>Poll</strong> — needs `&lt;PollOption&gt;` children.
      </div>
    );
  }

  const total = counts.reduce((s, n) => s + n, 0);

  return (
    <section className="bg-card my-6 rounded-lg border p-4 shadow-sm">
      {question && (
        <header className="mb-3">
          <div className="text-primary mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
            Poll
          </div>
          <div className="text-foreground text-[14px] font-semibold leading-snug">
            {question}
          </div>
        </header>
      )}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {options.map((o, i) => {
          const c = counts[i] ?? 0;
          const pct = total > 0 ? Math.round((c / total) * 100) : 0;
          return (
            <li key={i} className="m-0 p-0">
              <button
                type="button"
                disabled={picked !== null}
                onClick={() => vote(i)}
                className={[
                  "relative w-full overflow-hidden rounded-md border p-2.5 text-left text-sm transition-colors",
                  picked === i
                    ? "border-primary bg-primary/5"
                    : "bg-card hover:bg-muted/40",
                  picked !== null ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
                aria-label={o.text}
              >
                {picked !== null && (
                  <span
                    aria-hidden
                    className="bg-primary/10 absolute inset-y-0 left-0"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <span className="relative flex items-center justify-between gap-2">
                  <span className="text-foreground">{o.body}</span>
                  {picked !== null && (
                    <span className="text-muted-foreground tabular-nums text-[11px]">
                      {c} · {pct}%
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null && (
        <div className="text-muted-foreground mt-2 flex items-center justify-between text-[11px]">
          <span>{total} vote{total === 1 ? "" : "s"} (local only)</span>
          <button
            type="button"
            onClick={() => {
              if (typeof localStorage !== "undefined") {
                localStorage.removeItem(storageKey);
              }
              setCounts(options.map(() => 0));
              setPicked(null);
            }}
            className="hover:text-foreground underline"
          >
            ↻ reset
          </button>
        </div>
      )}
    </section>
  );
}

export function PollOption(_p: Record<string, unknown>) {
  return null;
}
PollOption.displayName = "PollOption";

function collectText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    return collectText(
      (node as { props: { children?: ReactNode } }).props.children
    );
  }
  return "";
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
