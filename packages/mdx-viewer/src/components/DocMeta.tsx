/**
 * DocMeta — two tiny "doc workflow" chips.
 *
 *     <LastUpdated date="2026-04-25" by="aman" />
 *     <EditThisPage repo="thesatellite-ai/filemark" path="examples/showcase.md" branch="main" />
 *
 * Both render as compact pills meant to sit at the top of a long doc.
 * LastUpdated formats `date=` as "updated N days ago"; EditThisPage
 * builds a link to the GitHub web editor at the named branch+path.
 */

export function LastUpdated(props: Record<string, unknown>) {
  const date = asString(props.date);
  const by = asString(props.by);
  const rel = relativeDate(date);
  return (
    <span className="bg-muted text-muted-foreground my-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px]">
      <ClockIcon />
      <span>updated {rel || date}</span>
      {by && (
        <>
          <span aria-hidden className="opacity-60">
            ·
          </span>
          <span>
            by <span className="text-foreground font-medium">@{by}</span>
          </span>
        </>
      )}
    </span>
  );
}

export function EditThisPage(props: Record<string, unknown>) {
  const repo = asString(props.repo);
  const path = asString(props.path);
  const branch = asString(props.branch) || "main";
  if (!repo || !path) {
    return (
      <span className="bg-muted text-muted-foreground my-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] italic">
        EditThisPage — needs `repo` + `path` props
      </span>
    );
  }
  const href = `https://github.com/${repo}/edit/${branch}/${path}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-muted text-muted-foreground hover:text-foreground hover:bg-accent my-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] transition-colors"
      title={`Open ${repo}/${path} in GitHub web editor`}
    >
      <PencilIcon />
      <span>Edit this page</span>
    </a>
  );
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function relativeDate(iso: string): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return "";
  const then = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  const ms = Date.now() - then.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
