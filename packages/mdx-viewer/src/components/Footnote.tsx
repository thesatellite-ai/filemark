import { useState, type ReactNode } from "react";

/**
 * Footnote — inline numbered footnote ref.
 *
 *     Filemark renders every doc with persistent state.<Footnote>
 *     Persistence uses an injected StorageAdapter — IndexedDB in
 *     chrome-ext, in-memory in playground.</Footnote>
 *
 * Numbered automatically per render order; click to toggle a popover
 * with the body. Tufte-inspired sidenote feel without margin overflow.
 */
let footnoteCounter = { n: 0 };
// Reset the counter at the start of each MDXViewer render. We can't
// truly reset it from inside one Footnote component (it's bound at
// module scope), but using a ref-counter that wraps every 100 keeps
// the numbers small enough to be useful within a single doc.

export function Footnote({ children }: { children?: ReactNode }) {
  const [n] = useState(() => {
    footnoteCounter.n = (footnoteCounter.n % 100) + 1;
    return footnoteCounter.n;
  });
  const [open, setOpen] = useState(false);
  return (
    <span className="fv-footnote relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-primary hover:bg-primary/10 mx-0.5 inline-flex size-4 items-center justify-center rounded-full text-[10px] font-semibold align-text-top tabular-nums transition-colors"
        title="Show footnote"
        aria-expanded={open}
      >
        {n}
      </button>
      {open && (
        <span
          role="note"
          className="bg-card text-foreground absolute left-1/2 top-full z-20 mt-1 inline-block w-64 -translate-x-1/2 rounded-md border p-2 text-[12px] leading-snug shadow-lg"
        >
          <span className="text-muted-foreground mr-1 text-[10px] font-bold tabular-nums">
            [{n}]
          </span>
          {children}
        </span>
      )}
    </span>
  );
}
