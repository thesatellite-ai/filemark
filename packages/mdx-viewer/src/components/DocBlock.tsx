import type { ReactNode } from "react";
import { TONE_CLASS, type StatusTone } from "@filemark/datagrid";

/**
 * DocBlock — the one wrapper for every header-strip-+-body planning
 * doc-block. Named `<DocBlock>` (not `<Card>`) so a generic UI Card
 * primitive — shadcn-style — can keep its own slot for non-doc use.
 *
 * Replaces the per-template components (PRFAQ / RFC / Pitch / PostMortem /
 * MeetingNotes / DailyNote) — all collapsed into a single `<DocBlock>` with
 * `kind=` smart defaults that fill in kicker / variant / status-chip /
 * meta-strip layout for the common shapes.
 *
 * Manual mode (no `kind`):
 *
 *     <DocBlock kicker="Spike" title="Inline AI hooks" variant="dashed">
 *     ...
 *     </DocBlock>
 *
 * Smart-kind modes (PRFAQ shape, RFC shape, etc.):
 *
 *     <DocBlock kind="prfaq" title="..." subhead="..." date="..." author="...">
 *     <DocBlock kind="rfc" status="proposed" id="RFC-0042" date="..." title="...">
 *     <DocBlock kind="pitch" problem="..." appetite="2 days" owner="...">
 *     <DocBlock kind="postmortem" severity="sev2" service="api" date="..." duration="42m" title="...">
 *     <DocBlock kind="meeting" title="..." date="..." time="..." facilitator="..." attendees="aman,grace">
 *     <DocBlock kind="daily" date="2026-04-24" yesterday="..." tomorrow="..." mood="..." weather="...">
 *
 * Each `kind` is a thin internal dispatcher that resolves attrs into the
 * generic slots below. Anything unknown falls through to manual mode so
 * authors can override / extend any preset.
 */

export type TemplateVariant = "flat" | "gradient" | "dashed";

export interface TemplateChip {
  tone: StatusTone;
  label: string;
}

export interface TemplateMetaItem {
  label?: string;
  value: ReactNode;
  mono?: boolean;
  pill?: boolean;
}

export interface DocBlockProps {
  /** Smart preset — fills kicker / variant / chip / meta from kind-specific attrs. */
  kind?: string;
  // Manual slots (always available; override any kind preset)
  kicker?: ReactNode;
  title?: ReactNode;
  titleAs?: "h2" | "h3";
  subtitle?: ReactNode;
  chip?: TemplateChip;
  meta?: TemplateMetaItem[];
  aside?: ReactNode;
  variant?: TemplateVariant;
  asArticle?: boolean;
  bodyClassName?: string;
  children?: ReactNode;
  // Catch-all for kind-specific attrs (status, severity, date, attendees…).
  // We use a permissive index signature so the same `<Card>` element can
  // accept arbitrary HTML attributes like a normal MDX component.
  [key: string]: unknown;
}

const VARIANT_CLASSES: Record<TemplateVariant, { card: string; header: string }> = {
  flat: {
    card: "bg-card my-6 rounded-lg border p-5 shadow-sm",
    header: "mb-4 flex flex-wrap items-center gap-2 border-b pb-3",
  },
  gradient: {
    card: "bg-card my-6 overflow-hidden rounded-lg border shadow-sm",
    header: "from-primary/10 to-card border-b bg-gradient-to-br p-5",
  },
  dashed: {
    card: "bg-card my-6 overflow-hidden rounded-lg border shadow-sm",
    header: "border-b border-dashed p-5",
  },
};

export function DocBlock(props: DocBlockProps) {
  // Resolve kind preset → preset slot defaults; manual props on the
  // element override anything the preset put in.
  const preset = resolveKind(props);

  const variant: TemplateVariant = (props.variant ?? preset.variant ?? "flat") as TemplateVariant;
  const titleAs = props.titleAs ?? preset.titleAs ?? "h3";
  const asArticle = props.asArticle ?? preset.asArticle ?? false;
  const kicker = props.kicker ?? preset.kicker;
  const title = props.title ?? preset.title;
  const subtitle = props.subtitle ?? preset.subtitle;
  const chip = props.chip ?? preset.chip;
  const meta = props.meta ?? preset.meta;
  const aside = props.aside ?? preset.aside;

  const v = VARIANT_CLASSES[variant];
  const Tag = asArticle ? "article" : "section";
  const TitleTag = titleAs;

  return (
    <Tag className={v.card}>
      {(kicker || title || subtitle || chip || (meta && meta.length > 0) || aside) && (
        <header className={v.header}>
          {kicker && (
            <div className="text-primary mb-1 w-full text-[10px] font-semibold uppercase tracking-[0.18em]">
              {kicker}
            </div>
          )}
          {title && (
            <TitleTag
              className={
                TitleTag === "h2"
                  ? "text-foreground mt-0 mb-2 w-full text-2xl leading-tight font-bold"
                  : "text-foreground mt-0 mb-2 w-full text-base leading-tight font-semibold"
              }
            >
              {title}
            </TitleTag>
          )}
          {subtitle && (
            <div className="text-muted-foreground mt-0 mb-3 w-full text-base leading-snug">
              {subtitle}
            </div>
          )}
          {(chip || (meta && meta.length > 0) || aside) && (
            <div className="text-muted-foreground flex w-full flex-wrap items-center gap-3 text-xs">
              {chip && (
                <span
                  className={[
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                    TONE_CLASS[chip.tone],
                  ].join(" ")}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                  {chip.label}
                </span>
              )}
              {meta?.map((m, i) => (
                <MetaItem key={i} item={m} />
              ))}
              {aside && <span className="ml-auto">{aside}</span>}
            </div>
          )}
        </header>
      )}
      <div
        className={[
          variant === "gradient" || variant === "dashed" ? "p-5" : "",
          "text-sm leading-relaxed",
          props.bodyClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {props.children}
      </div>
    </Tag>
  );
}

function MetaItem({ item }: { item: TemplateMetaItem }) {
  const value = item.mono ? (
    <span className="tabular-nums">{item.value}</span>
  ) : (
    item.value
  );
  if (item.pill) {
    return (
      <span className="bg-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5">
        {item.label && (
          <span className="text-[10px] uppercase tracking-wide opacity-70">
            {item.label}
          </span>
        )}
        <span>{value}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      {item.label && <span className="opacity-70">{item.label}</span>}
      <span>{value}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Smart-kind preset resolver. Each branch turns kind-specific attrs into
// the generic slot model above. Manual props always win.
// ─────────────────────────────────────────────────────────────────────────

interface ResolvedPreset {
  kicker?: ReactNode;
  title?: ReactNode;
  titleAs?: "h2" | "h3";
  subtitle?: ReactNode;
  chip?: TemplateChip;
  meta?: TemplateMetaItem[];
  aside?: ReactNode;
  variant?: TemplateVariant;
  asArticle?: boolean;
}

function resolveKind(props: DocBlockProps): ResolvedPreset {
  const kind = String(props.kind ?? "").trim().toLowerCase();
  switch (kind) {
    case "prfaq":
      return prfaqPreset(props);
    case "rfc":
      return rfcPreset(props);
    case "pitch":
      return pitchPreset(props);
    case "postmortem":
      return postmortemPreset(props);
    case "meeting":
    case "meetingnotes":
      return meetingPreset(props);
    case "daily":
    case "dailynote":
      return dailyPreset(props);
    default:
      return {};
  }
}

function prfaqPreset(p: DocBlockProps): ResolvedPreset {
  const date = asString(p.date);
  const author = asString(p.author);
  return {
    kicker: "PR / FAQ",
    title: asString(p.title) || undefined,
    titleAs: "h2",
    subtitle: asString(p.subhead) || undefined,
    meta: filterMeta([
      date && { value: date, mono: true },
      author && { value: author },
    ]),
    variant: "gradient",
  };
}

const RFC_TONE: Record<string, StatusTone> = {
  draft: "muted",
  proposed: "info",
  accepted: "success",
  rejected: "danger",
  withdrawn: "muted",
  implemented: "success",
};
const RFC_LABEL: Record<string, string> = {
  draft: "Draft",
  proposed: "Proposed",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  implemented: "Implemented",
};

function rfcPreset(p: DocBlockProps): ResolvedPreset {
  const status = String(p.status ?? "draft").trim().toLowerCase();
  const tone = RFC_TONE[status] ?? "muted";
  const label = RFC_LABEL[status] ?? "Draft";
  const id = asString(p.id);
  const date = asString(p.date);
  const author = asString(p.author);
  return {
    title: asString(p.title) || undefined,
    chip: { tone, label },
    meta: filterMeta([
      id && {
        value: (
          <code className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[11px]">
            {id}
          </code>
        ),
      },
      date && { value: date, mono: true },
      author && { label: "by", value: author },
    ]),
    variant: "flat",
  };
}

function pitchPreset(p: DocBlockProps): ResolvedPreset {
  const problem = asString(p.problem);
  const appetite = asString(p.appetite);
  const owner = asString(p.owner);
  return {
    kicker: "Shape-Up Pitch",
    title: asString(p.title) || undefined,
    subtitle: problem ? (
      <>
        <span className="text-muted-foreground mr-2 text-[11px] font-semibold uppercase tracking-wide">
          Problem
        </span>
        {problem}
      </>
    ) : undefined,
    meta: filterMeta([
      appetite && { label: "Appetite", value: appetite, pill: true },
      owner && { label: "owner", value: owner },
    ]),
    variant: "dashed",
  };
}

const SEV_TONE: Record<string, StatusTone> = {
  sev1: "danger",
  sev2: "warn",
  sev3: "info",
  sev4: "muted",
};
const SEV_LABEL: Record<string, string> = {
  sev1: "SEV 1",
  sev2: "SEV 2",
  sev3: "SEV 3",
  sev4: "SEV 4",
};

function postmortemPreset(p: DocBlockProps): ResolvedPreset {
  const severity = String(p.severity ?? "sev3").trim().toLowerCase().replace(/\s+/g, "");
  const tone = SEV_TONE[severity] ?? "info";
  const label = SEV_LABEL[severity] ?? "SEV 3";
  const date = asString(p.date);
  const duration = asString(p.duration);
  const service = asString(p.service);
  return {
    title: asString(p.title) || undefined,
    chip: { tone, label },
    meta: filterMeta([
      service && {
        value: (
          <code className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[11px]">
            {service}
          </code>
        ),
      },
      date && { value: date, mono: true },
      duration && { label: "·", value: duration },
    ]),
    variant: "flat",
  };
}

function meetingPreset(p: DocBlockProps): ResolvedPreset {
  const date = asString(p.date);
  const time = asString(p.time);
  const facilitator = asString(p.facilitator);
  const attendees = parseList(asString(p.attendees));
  return {
    kicker: "Meeting notes",
    title: asString(p.title) || undefined,
    meta: filterMeta([
      date && { value: date, mono: true },
      time && { label: "·", value: time, mono: true },
      facilitator && { label: "facilitator", value: facilitator },
      attendees.length > 0 && {
        label: "attendees",
        value: <AttendeePills names={attendees} />,
      },
    ]),
    variant: "flat",
  };
}

function dailyPreset(p: DocBlockProps): ResolvedPreset {
  const dateStr = asString(p.date) || todayISO();
  const yesterday = asString(p.yesterday);
  const tomorrow = asString(p.tomorrow);
  const mood = asString(p.mood);
  const weather = asString(p.weather);
  return {
    kicker: `Daily Note · ${formatDayOfWeek(dateStr)}`,
    title: <span className="tabular-nums">{formatDateLabel(dateStr)}</span>,
    titleAs: "h2",
    meta: filterMeta([
      mood && { label: "mood", value: mood, pill: true },
      weather && { label: "weather", value: weather, pill: true },
    ]),
    aside: yesterday || tomorrow ? (
      <span className="flex items-center gap-3 text-[11px]">
        {yesterday && (
          <a href={`#${yesterday}`} className="hover:text-foreground inline-flex items-center gap-1">
            ← {yesterday}
          </a>
        )}
        {tomorrow && (
          <a href={`#${tomorrow}`} className="hover:text-foreground inline-flex items-center gap-1">
            {tomorrow} →
          </a>
        )}
      </span>
    ) : undefined,
    variant: "gradient",
    asArticle: true,
  };
}

function AttendeePills({ names }: { names: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {names.map((a, i) => (
        <span
          key={i}
          className="bg-muted text-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
        >
          <span className="bg-primary/15 text-primary inline-flex size-3.5 items-center justify-center rounded-full text-[8px] font-semibold uppercase">
            {a.slice(0, 1)}
          </span>
          {a}
        </span>
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function parseList(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function filterMeta(
  items: (TemplateMetaItem | false | "" | null | undefined)[]
): TemplateMetaItem[] {
  return items.filter(Boolean) as TemplateMetaItem[];
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(iso: string): string {
  const d = parseIso(iso);
  if (!d) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDayOfWeek(iso: string): string {
  const d = parseIso(iso);
  if (!d) return "";
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(d.getTime()) ? null : d;
}
