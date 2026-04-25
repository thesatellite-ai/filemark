import type { ReactNode } from "react";

/**
 * PullQuote — styled quote block for testimonials / featured statements.
 *
 *     <PullQuote author="Linus Torvalds" role="creator of Linux">
 *     Talk is cheap. Show me the code.
 *     </PullQuote>
 *
 * Use `<Testimonials cols="3">` to lay out a grid of multiple quotes.
 */
export function PullQuote(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const author = asString(props.author);
  const role = asString(props.role);
  const avatar = asString(props.avatar);

  return (
    <figure className="bg-card my-6 overflow-hidden rounded-lg border-l-4 border-primary p-5 shadow-sm">
      <blockquote className="text-foreground m-0 text-[15px] leading-relaxed italic">
        <span className="text-primary mr-1 text-2xl leading-none">&ldquo;</span>
        {props.children}
        <span className="text-primary ml-1 text-2xl leading-none">&rdquo;</span>
      </blockquote>
      {(author || role || avatar) && (
        <figcaption className="text-muted-foreground mt-3 flex items-center gap-2 text-[12px]">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="size-7 rounded-full object-cover"
            />
          ) : (
            author && (
              <span className="bg-primary/15 text-primary inline-flex size-7 items-center justify-center rounded-full text-[11px] font-semibold uppercase">
                {author.slice(0, 1)}
              </span>
            )
          )}
          <span>
            {author && (
              <span className="text-foreground font-medium">{author}</span>
            )}
            {role && (
              <>
                {author && <span aria-hidden> · </span>}
                <span>{role}</span>
              </>
            )}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

export function Testimonials({
  cols,
  children,
}: {
  cols?: string | number;
  children?: ReactNode;
}) {
  const c = String(cols ?? 3);
  const cls =
    c === "2"
      ? "grid-cols-1 sm:grid-cols-2"
      : c === "4"
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={["fv-testimonials my-6 grid gap-3", cls].join(" ")}>
      {children}
    </div>
  );
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
