import { useEffect, useRef, useState } from "react";

/**
 * ReadingTime — small "~N min read" chip.
 *
 *     <ReadingTime />                 // auto-counts words from the doc
 *     <ReadingTime words="2400" />    // explicit override
 *     <ReadingTime wpm="200" />       // adjust pace; default 230
 *
 * When `words=` is omitted, the component looks up to its enclosing
 * `<article>` (the `.fv-mdx-body` element) once mounted and counts
 * visible text words. Recomputes when the article subtree mutates.
 */
export function ReadingTime(props: Record<string, unknown>) {
  const explicitWords = numOrUndef(props.words);
  const wpm = numOrUndef(props.wpm) ?? 230;
  const ref = useRef<HTMLSpanElement | null>(null);
  const [auto, setAuto] = useState<number | null>(null);

  useEffect(() => {
    if (explicitWords !== undefined) return;
    const root = ref.current?.closest(".fv-mdx-body") as HTMLElement | null;
    if (!root) return;
    const recount = () => {
      const text = root.textContent ?? "";
      const w = text.trim().split(/\s+/).filter(Boolean).length;
      setAuto(w);
    };
    recount();
    const obs = new MutationObserver(recount);
    obs.observe(root, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, [explicitWords]);

  const words = explicitWords ?? auto ?? 0;
  const minutes = Math.max(1, Math.round(words / wpm));

  return (
    <span
      ref={ref}
      className="bg-muted text-muted-foreground my-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
      title={`${words.toLocaleString()} words at ${wpm} wpm`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      ~{minutes} min read
    </span>
  );
}

function numOrUndef(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}
