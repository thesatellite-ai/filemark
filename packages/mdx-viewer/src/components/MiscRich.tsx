import type { ReactNode } from "react";

/**
 * Miscellaneous M16 components grouped here for brevity:
 *   - AISummary       — placeholder slot for a host-provided summariser
 *   - CalloutWithAction — Callout variant with a primary button
 *   - AuthorCard      — inline author bio
 *   - PackageBadge    — npm-style version + downloads + license chip
 */

export function AISummary(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const status = String(props.status ?? "pending").toLowerCase();
  const placeholder =
    asString(props.placeholder) ||
    "AI summary will appear here once a summariser is wired in.";
  return (
    <aside className="bg-card my-6 rounded-lg border border-dashed p-4 shadow-sm">
      <header className="mb-2 flex items-center gap-2">
        <span className="text-primary text-[10px] font-semibold uppercase tracking-[0.18em]">
          AI summary
        </span>
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            status === "ready"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
          ].join(" ")}
        >
          {status === "ready" ? "ready" : "placeholder"}
        </span>
      </header>
      <div className="text-foreground text-[13px] leading-relaxed">
        {props.children || (
          <p className="text-muted-foreground italic">{placeholder}</p>
        )}
      </div>
    </aside>
  );
}

/**
 * CalloutWithAction — refined docs-style callout with inline CTA.
 *
 *     <CalloutWithAction tone="info" title="Try the playground" action="Open" href="…">
 *     The playground bundles every example doc under one gallery.
 *     </CalloutWithAction>
 *
 * Design: clean `bg-card` surface; tone color is an accent only
 * (left bar + icon chip + arrow link), never a tinted background.
 * Title in foreground for readability, body in muted-foreground,
 * CTA as an inline arrow link that translates on group hover.
 * Subtle shadow lift on card hover.
 */
export function CalloutWithAction(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const title = asString(props.title);
  const action = asString(props.action) || "Learn more";
  const href = asString(props.href);
  const tone = normalizeTone(props.tone);
  const isExternal = href.startsWith("http");
  const Icon = ICON_BY_TONE[tone];

  return (
    <div
      className={[
        "fv-callout-action group/callout bg-card relative my-6 overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md",
        TONE_BORDER[tone],
      ].join(" ")}
    >
      <span
        aria-hidden
        className={["absolute inset-y-0 left-0 w-[3px]", TONE_BAR[tone]].join(
          " "
        )}
      />
      <div className="flex gap-3.5 p-4 pl-[18px]">
        <div
          aria-hidden
          className={[
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
            TONE_CHIP[tone],
          ].join(" ")}
        >
          <Icon />
        </div>
        <div className="min-w-0 flex-1">
          {title && (
            <div className="text-foreground text-[14px] font-semibold leading-tight tracking-tight">
              {title}
            </div>
          )}
          {props.children && (
            <div className="text-muted-foreground mt-1 text-[13px] leading-relaxed [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
              {props.children}
            </div>
          )}
          {href && (
            <a
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className={[
                "fv-callout-cta mt-3 inline-flex items-center gap-1 text-[13px] font-medium no-underline hover:no-underline",
                TONE_CTA[tone],
              ].join(" ")}
            >
              {action}
              <span
                aria-hidden
                className="inline-block transition-transform duration-200 group-hover/callout:translate-x-0.5"
              >
                {isExternal ? "↗" : "→"}
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

type Tone = "info" | "success" | "warn" | "danger";

function normalizeTone(v: unknown): Tone {
  const s = String(v ?? "info").toLowerCase();
  if (s === "info" || s === "success" || s === "warn" || s === "danger")
    return s;
  return "info";
}

const TONE_BORDER: Record<Tone, string> = {
  info: "border-blue-200/70 dark:border-blue-500/20",
  success: "border-emerald-200/70 dark:border-emerald-500/20",
  warn: "border-amber-200/70 dark:border-amber-500/20",
  danger: "border-rose-200/70 dark:border-rose-500/20",
};

const TONE_BAR: Record<Tone, string> = {
  info: "bg-blue-500 dark:bg-blue-400",
  success: "bg-emerald-500 dark:bg-emerald-400",
  warn: "bg-amber-500 dark:bg-amber-400",
  danger: "bg-rose-500 dark:bg-rose-400",
};

const TONE_CHIP: Record<Tone, string> = {
  info: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  success:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  warn: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
};

const TONE_CTA: Record<Tone, string> = {
  info: "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
  success:
    "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300",
  warn: "text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300",
  danger:
    "text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300",
};

const ICON_BY_TONE: Record<Tone, () => React.ReactElement> = {
  info: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <circle cx="12" cy="8" r="0.8" fill="currentColor" />
    </svg>
  ),
  success: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <polyline points="5 12 10 17 19 7" />
    </svg>
  ),
  warn: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" />
    </svg>
  ),
  danger: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

export function AuthorCard(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const name = asString(props.name);
  const role = asString(props.role);
  const avatar = asString(props.avatar);
  const url = asString(props.url);
  const twitter = asString(props.twitter);
  const github = asString(props.github);
  return (
    <aside className="bg-card my-6 flex items-start gap-3 rounded-lg border p-4 shadow-sm">
      {avatar ? (
        <img
          src={avatar}
          alt={name || "author"}
          className="size-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        name && (
          <span className="bg-primary/15 text-primary inline-flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold uppercase">
            {name.slice(0, 1)}
          </span>
        )
      )}
      <div className="min-w-0 flex-1">
        {name && (
          <div className="text-foreground text-[14px] font-semibold leading-tight">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary no-underline"
              >
                {name}
              </a>
            ) : (
              name
            )}
          </div>
        )}
        {role && (
          <div className="text-muted-foreground text-[12px]">{role}</div>
        )}
        {props.children && (
          <div className="text-muted-foreground mt-1 text-[12px] leading-snug">
            {props.children}
          </div>
        )}
        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-[11px]">
          {twitter && (
            <a
              href={`https://twitter.com/${twitter.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              @{twitter.replace(/^@/, "")}
            </a>
          )}
          {github && (
            <a
              href={`https://github.com/${github.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              ◆ {github.replace(/^@/, "")}
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}

export function PackageBadge(props: Record<string, unknown>) {
  const name = asString(props.name);
  const type = (asString(props.type) || "npm").toLowerCase();
  const version = asString(props.version);
  const downloads = asString(props.downloads);
  const license = asString(props.license);
  const stars = asString(props.stars);
  const url = asString(props.url) ||
    (type === "npm" && name ? `https://www.npmjs.com/package/${name}` : "");
  return (
    <a
      href={url || "#"}
      target={url ? "_blank" : undefined}
      rel={url ? "noopener noreferrer" : undefined}
      className="bg-card hover:bg-muted/40 my-2 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px] no-underline transition-colors"
    >
      <span className="bg-primary/15 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase">
        {type}
      </span>
      <code className="text-foreground font-mono text-[12px] font-semibold">
        {name}
      </code>
      {version && (
        <span className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[10px]">
          v{version}
        </span>
      )}
      {downloads && (
        <span className="text-muted-foreground tabular-nums">
          ↓ {downloads}
        </span>
      )}
      {stars && (
        <span className="text-muted-foreground tabular-nums">★ {stars}</span>
      )}
      {license && (
        <span className="text-muted-foreground italic">{license}</span>
      )}
    </a>
  );
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
