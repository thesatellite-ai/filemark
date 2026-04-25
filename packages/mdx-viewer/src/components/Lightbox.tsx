import { useEffect, useState, type ReactNode } from "react";

/**
 * Lightbox — wrap an image (or several) with click-to-fullscreen.
 *
 *     <Lightbox src="./screenshot.png" alt="UI" />
 *
 *     <Lightbox>
 *       <img src="./a.png" alt="A" />
 *       <img src="./b.png" alt="B" />
 *     </Lightbox>
 *
 * Single-image form is the common case. For multi-image, click
 * cycles through arrows in the overlay; Esc closes.
 */
export function Lightbox(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const explicitSrc = asString(props.src);
  const explicitAlt = asString(props.alt);
  const sources: { src: string; alt: string }[] = [];
  if (explicitSrc) sources.push({ src: explicitSrc, alt: explicitAlt });
  // Walk children for <img>s
  walkImgs(props.children, sources);

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    if (openIdx == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIdx(null);
      else if (e.key === "ArrowRight")
        setOpenIdx((i) => (i == null ? null : (i + 1) % sources.length));
      else if (e.key === "ArrowLeft")
        setOpenIdx((i) =>
          i == null ? null : (i - 1 + sources.length) % sources.length
        );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, sources.length]);

  if (sources.length === 0) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>Lightbox</strong> — pass `src=` or wrap `&lt;img&gt;` children.
      </div>
    );
  }

  return (
    <>
      <div className="fv-lightbox my-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIdx(i)}
            className="bg-muted/15 group/lb overflow-hidden rounded-lg border"
          >
            <img
              src={s.src}
              alt={s.alt}
              loading="lazy"
              className="block max-w-full transition-transform group-hover/lb:scale-105"
            />
          </button>
        ))}
      </div>
      {openIdx != null && (
        <div
          role="dialog"
          aria-modal="true"
          className="bg-foreground/80 fixed inset-0 z-[1000] flex items-center justify-center p-8 backdrop-blur-sm"
          onClick={() => setOpenIdx(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenIdx(null);
            }}
            className="bg-background/95 absolute right-4 top-4 size-9 rounded-full border text-lg"
            aria-label="Close lightbox"
          >
            ✕
          </button>
          {sources.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIdx((openIdx - 1 + sources.length) % sources.length);
                }}
                className="bg-background/95 absolute left-4 top-1/2 size-10 -translate-y-1/2 rounded-full border text-xl"
                aria-label="Previous"
              >
                ←
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIdx((openIdx + 1) % sources.length);
                }}
                className="bg-background/95 absolute right-4 top-1/2 size-10 -translate-y-1/2 rounded-full border text-xl"
                aria-label="Next"
              >
                →
              </button>
            </>
          )}
          <img
            src={sources[openIdx].src}
            alt={sources[openIdx].alt}
            className="max-h-full max-w-full rounded-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function walkImgs(
  node: ReactNode,
  out: { src: string; alt: string }[]
): void {
  if (node == null || node === false) return;
  if (Array.isArray(node)) {
    for (const c of node) walkImgs(c, out);
    return;
  }
  if (typeof node === "object" && "props" in (node as object)) {
    const el = node as { type?: unknown; props: Record<string, unknown> };
    if (el.type === "img") {
      out.push({
        src: asString(el.props.src),
        alt: asString(el.props.alt),
      });
    }
    walkImgs((el.props as { children?: ReactNode }).children, out);
  }
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
