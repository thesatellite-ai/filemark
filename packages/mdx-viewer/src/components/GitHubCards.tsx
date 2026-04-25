import type { ReactNode } from "react";

/**
 * PRCard / IssueCard / CommitCard — GitHub artifacts as styled cards.
 *
 *     <PRCard repo="thesatellite-ai/filemark" number="42" state="merged"
 *             title="Add MindMap component" author="aman" />
 *     <IssueCard repo="thesatellite-ai/filemark" number="13" state="open"
 *                title="MindMap fullscreen exit doesn't refit" author="grace" />
 *     <CommitCard repo="thesatellite-ai/filemark" sha="a3f1c2d"
 *                 title="Fix table headers wrapping mid-word"
 *                 author="aman" date="2026-04-24" />
 *
 * Static — author fills the props from a screenshot or `gh` output.
 * Future: live fetch via GitHub API.
 */

const PR_STATE_TONE: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  merged: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  closed: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  draft: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
};

const ISSUE_STATE_TONE: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  closed: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
};

export function PRCard(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  return (
    <GitHubCard
      kind="PR"
      repo={asString(props.repo)}
      number={asString(props.number)}
      state={asString(props.state) || "open"}
      title={asString(props.title)}
      author={asString(props.author)}
      url={
        asString(props.url) ||
        (asString(props.repo) && asString(props.number)
          ? `https://github.com/${asString(props.repo)}/pull/${asString(props.number)}`
          : "")
      }
      stateTones={PR_STATE_TONE}
      icon="⤴"
    >
      {props.children}
    </GitHubCard>
  );
}

export function IssueCard(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  return (
    <GitHubCard
      kind="Issue"
      repo={asString(props.repo)}
      number={asString(props.number)}
      state={asString(props.state) || "open"}
      title={asString(props.title)}
      author={asString(props.author)}
      url={
        asString(props.url) ||
        (asString(props.repo) && asString(props.number)
          ? `https://github.com/${asString(props.repo)}/issues/${asString(props.number)}`
          : "")
      }
      stateTones={ISSUE_STATE_TONE}
      icon="●"
    >
      {props.children}
    </GitHubCard>
  );
}

export function CommitCard(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const sha = asString(props.sha);
  const repo = asString(props.repo);
  return (
    <GitHubCard
      kind="Commit"
      repo={repo}
      number={sha ? sha.slice(0, 7) : ""}
      state={asString(props.date)}
      title={asString(props.title)}
      author={asString(props.author)}
      url={
        asString(props.url) ||
        (repo && sha ? `https://github.com/${repo}/commit/${sha}` : "")
      }
      stateTones={{}}
      icon="◆"
      mono
    >
      {props.children}
    </GitHubCard>
  );
}

function GitHubCard({
  kind,
  repo,
  number,
  state,
  title,
  author,
  url,
  stateTones,
  icon,
  mono,
  children,
}: {
  kind: string;
  repo: string;
  number: string;
  state: string;
  title: string;
  author: string;
  url: string;
  stateTones: Record<string, string>;
  icon: string;
  mono?: boolean;
  children?: ReactNode;
}) {
  const tone = stateTones[state.toLowerCase()] ?? "bg-muted text-muted-foreground border";
  const Wrapper = url ? "a" : "div";
  const wrapperProps = url
    ? { href: url, target: "_blank", rel: "noopener noreferrer" }
    : {};
  return (
    <Wrapper
      {...wrapperProps}
      className="bg-card hover:bg-muted/40 my-3 block rounded-md border p-3 no-underline transition-colors"
    >
      <div className="flex flex-wrap items-center gap-2">
        {state && (
          <span
            className={[
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              tone,
            ].join(" ")}
          >
            <span aria-hidden>{icon}</span> {state}
          </span>
        )}
        <span className="text-muted-foreground text-[11px]">
          {kind}
          {repo && <span className="ml-1">{repo}</span>}
          {number && (
            <code
              className={[
                "bg-muted ml-1 rounded px-1 text-[10px]",
                mono ? "font-mono" : "",
              ].join(" ")}
            >
              {mono ? number : `#${number}`}
            </code>
          )}
        </span>
        {author && (
          <span className="text-muted-foreground ml-auto text-[11px]">
            @{author}
          </span>
        )}
      </div>
      {title && (
        <div className="text-foreground mt-1.5 text-[14px] font-medium leading-tight">
          {title}
        </div>
      )}
      {children && <div className="text-muted-foreground mt-1 text-[12px]">{children}</div>}
    </Wrapper>
  );
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
