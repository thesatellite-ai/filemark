import type { ReactNode } from "react";

/**
 * Cards / DocCard — landing-page card grid.
 *
 *     <Cards cols="3">
 *
 *     <DocCard icon="📦" title="Install" href="./install" badge="5 min">
 *     pnpm add filemark and follow the four steps.
 *     </DocCard>
 *
 *     <DocCard icon="🚀" title="Quick start" href="./quick-start">
 *     Open a `.md` file in 30 seconds.
 *     </DocCard>
 *
 *     </Cards>
 *
 * `<Cards>` lays out children in a responsive grid (1 / 2 / 3 / 4
 * columns via `cols=`). `<DocCard>` renders a clickable card with
 * optional icon (emoji or text), title, body, and tag/badge.
 *
 * Note: `<DocCard>` is intentionally distinct from `<DocBlock>` —
 * DocBlock is a single full-width section wrapper; DocCard is a tile
 * meant to be tiled in a grid.
 */
export function Cards({
  cols,
  children,
}: {
  cols?: string | number;
  children?: ReactNode;
}) {
  const c = normalizeCols(cols);
  return (
    <div className={["fv-cards my-6 grid gap-3", COLS_CLASS[c]].join(" ")}>
      {children}
    </div>
  );
}

const COLS_CLASS: Record<string, string> = {
  auto: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  "1": "grid-cols-1",
  "2": "grid-cols-1 sm:grid-cols-2",
  "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  "4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

function normalizeCols(cols: string | number | undefined): string {
  const s = cols == null ? "auto" : String(cols);
  if (s in COLS_CLASS) return s;
  return "auto";
}

export function DocCard(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const icon = asString(props.icon);
  const title = asString(props.title);
  const href = asString(props.href);
  const badge = asString(props.badge);

  const inner = (
    <div className="bg-card hover:bg-muted/40 group/card flex h-full flex-col gap-2 rounded-lg border p-4 shadow-sm transition-colors">
      <header className="flex items-start gap-2">
        {icon && (
          <span className="text-2xl leading-none" aria-hidden>
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {title && (
            <div className="text-foreground group-hover/card:text-primary text-[14px] font-semibold leading-tight transition-colors">
              {title}
            </div>
          )}
        </div>
        {badge && (
          <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
            {badge}
          </span>
        )}
      </header>
      {props.children && (
        <div className="text-muted-foreground text-[13px] leading-snug">
          {props.children}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        className="fv-doccard-link block h-full no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-lg"
      >
        {inner}
      </a>
    );
  }
  return inner;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
