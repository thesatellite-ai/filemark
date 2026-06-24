// Small presentational kit shared by every /docs page: a page header, a callout
// box, a screenshot figure, and prev/next nav. Keeps route files content-only.

import { Link } from "@tanstack/react-router";

/** A screenshot from /public/screenshots with a caption. `src` is the bare
 *  filename (e.g. "json.png"); resolved against the app base URL. Lazy-loaded
 *  with explicit alt text for SEO + a11y. */
export function Figure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}): React.ReactElement {
  return (
    <figure className="my-6">
      <img
        src={`${import.meta.env.BASE_URL}screenshots/${src}`}
        alt={alt}
        loading="lazy"
        className="w-full rounded-lg border border-border bg-card"
      />
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Sequential prev/next links at the bottom of a docs page. */
export function NextPrev({
  prev,
  next,
}: {
  prev?: { to: string; label: string };
  next?: { to: string; label: string };
}): React.ReactElement {
  return (
    <nav className="mt-12 flex items-center justify-between gap-4 border-t border-border pt-6 text-sm">
      {prev ? (
        <Link
          to={prev.to}
          className="text-muted-foreground no-underline hover:text-foreground"
        >
          ← {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={next.to}
          className="text-right font-medium text-foreground no-underline hover:text-primary"
        >
          {next.label} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function DocsHeader({
  kicker,
  title,
  intro,
}: {
  kicker?: string;
  title: string;
  intro?: string;
}): React.ReactElement {
  return (
    <header className="mb-6 border-b border-border pb-5">
      {kicker && (
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {kicker}
        </p>
      )}
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      {intro && (
        <p className="mt-3 text-base text-muted-foreground">{intro}</p>
      )}
    </header>
  );
}

type NoteTone = "info" | "tip" | "warn";

const TONE: Record<NoteTone, string> = {
  info: "border-blue-500/30 bg-blue-500/5",
  tip: "border-emerald-500/30 bg-emerald-500/5",
  warn: "border-amber-500/40 bg-amber-500/5",
};

export function Note({
  tone = "info",
  title,
  children,
}: {
  tone?: NoteTone;
  title?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className={`my-4 rounded-lg border p-4 text-[14px] leading-relaxed ${TONE[tone]}`}>
      {title && <p className="mb-1 font-semibold text-foreground">{title}</p>}
      <div className="text-foreground/80">{children}</div>
    </div>
  );
}
