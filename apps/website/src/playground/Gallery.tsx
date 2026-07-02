import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table2,
  BarChart3,
  KanbanSquare,
  NotebookText,
  CheckSquare,
  Brain,
  Database,
  BookOpen,
  Sparkles,
  FileText,
  Search,
  Upload,
  Menu,
  X,
  ExternalLink,
  Link2,
} from "lucide-react";
import { getExample, groupedExamples } from "./examples";
import { RenderedDoc, GithubDoc } from "./RenderedDoc";
import { MonacoPane } from "./MonacoPane";

type ViewMode = "rendered" | "raw" | "github";

// Section → icon mapping. Fallback to FileText keeps the layout stable
// for any section name we haven't styled yet.
const SECTION_ICON: Record<string, typeof Table2> = {
  Datagrid: Table2,
  Chart: BarChart3,
  Kanban: KanbanSquare,
  Planning: NotebookText,
  Tasks: CheckSquare,
  Mindmap: Brain,
  MindMap: Brain,
  Schema: Database,
  "Stats & ADR": BarChart3,
  "Rich docs": BookOpen,
  Showcase: Sparkles,
};

export function Gallery({
  initialId,
  onChange,
  userDoc,
  onUserDrop,
}: {
  initialId: string;
  onChange: (id: string) => void;
  userDoc: { name: string; content: string } | null;
  onUserDrop: (doc: { name: string; content: string }) => void;
}) {
  const [activeId, setActiveId] = useState(initialId);
  const [mode, setMode] = useState<ViewMode>("rendered");
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => setActiveId(initialId), [initialId]);
  useEffect(() => {
    setDrawerOpen(false);
  }, [activeId]);

  const activeExample = useMemo(() => getExample(activeId), [activeId]);
  const groups = useMemo(() => groupedExamples(), []);
  const showingUser = activeId === "__user__" && userDoc;

  // Filter on title/description; preserve grouping but hide empty groups.
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (ex) =>
            ex.title.toLowerCase().includes(q) ||
            ex.description.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const currentContent = showingUser
    ? userDoc!.content
    : activeExample?.content ?? "";
  const currentName = showingUser
    ? userDoc!.name
    : activeExample
      ? `${activeExample.id}.md`
      : "example.md";

  const select = (id: string) => {
    setActiveId(id);
    onChange(id);
  };

  const onCopy = useCallback(() => {
    navigator.clipboard?.writeText(currentContent).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [currentContent]);

  return (
    <div className="relative flex h-full min-h-0 bg-background">
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close examples drawer"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}
      <aside
        className={[
          "flex flex-col bg-sidebar text-sidebar-foreground shrink-0 border-r border-border",
          "md:w-72 md:relative md:translate-x-0",
          "fixed inset-y-0 left-0 z-40 w-72 transition-transform duration-200 md:transition-none",
          drawerOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Filter bar */}
        <div className="shrink-0 border-b border-sidebar-border/70 p-3">
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter examples"
              className="h-8 w-full rounded-md border border-sidebar-border bg-background/60 pl-7 pr-7 text-[12px] outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-ring"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear filter"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Examples — single-line items, left-accent on active, icon per category */}
        <nav className="flex-1 overflow-auto py-1">
          {userDoc && (
            <Group
              section="Your file"
              Icon={Upload}
              items={[
                {
                  id: "__user__",
                  title: userDoc.name,
                  description: "Dropped or opened locally",
                },
              ]}
              activeId={activeId}
              onPick={select}
            />
          )}
          {filteredGroups.map((group) => (
            <Group
              key={group.section}
              section={group.section}
              Icon={SECTION_ICON[group.section] ?? FileText}
              items={group.items.map((ex) => ({
                id: ex.id,
                title: ex.title,
                description: ex.description,
              }))}
              activeId={activeId}
              onPick={select}
            />
          ))}
          {filteredGroups.length === 0 && (
            <div className="px-4 py-8 text-center text-[11px] text-muted-foreground">
              No examples match "{query}".
            </div>
          )}
        </nav>

        <DropTarget onDrop={onUserDrop} />
      </aside>

      <main className="flex flex-1 min-w-0 flex-col bg-background">
        {(showingUser || activeExample) && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background/60 px-3 py-1.5 text-[11.5px] backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open examples"
                className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground md:hidden"
              >
                <Menu size={14} />
              </button>
              <span className="truncate font-medium text-foreground/85">
                {showingUser && userDoc ? userDoc.name : activeExample?.title}
              </span>
              <span className="hidden truncate font-mono text-[10.5px] text-muted-foreground sm:inline">
                {currentName}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="inline-flex rounded-md border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setMode("rendered")}
                  className={tabButton(mode === "rendered")}
                  title="Show the rendered markdown + datagrid view"
                >
                  Rendered
                </button>
                <button
                  type="button"
                  onClick={() => setMode("raw")}
                  className={tabButton(mode === "raw")}
                  title="Show the raw markdown source in Monaco editor"
                >
                  Raw
                </button>
                <button
                  type="button"
                  onClick={() => setMode("github")}
                  className={tabButton(mode === "github")}
                  title="Preview how this renders on GitHub (plain GFM, no filemark components)"
                >
                  GitHub
                </button>
              </div>
              <button
                type="button"
                onClick={onCopy}
                className="h-6 rounded-md border border-border bg-background px-2 font-medium text-muted-foreground transition-colors hover:text-foreground"
                title="Copy the raw markdown source to clipboard"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
              {activeExample?.filename && (
                <DemoFileLinks filename={activeExample.filename} />
              )}
            </div>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-hidden">
          {mode === "raw" && (showingUser || activeExample) ? (
            <MonacoPane
              value={currentContent}
              readOnly
              language="markdown"
            />
          ) : showingUser && userDoc ? (
            <div className="h-full overflow-auto">
              {mode === "github" ? (
                <GithubDoc
                  content={userDoc.content}
                  fileId="user-doc"
                  name={userDoc.name}
                />
              ) : (
                <RenderedDoc
                  content={userDoc.content}
                  fileId="user-doc"
                  name={userDoc.name}
                />
              )}
            </div>
          ) : activeExample ? (
            <div className="h-full overflow-auto">
              {mode === "github" ? (
                <GithubDoc
                  content={activeExample.content}
                  fileId={activeExample.id}
                  name={`${activeExample.id}.md`}
                />
              ) : (
                <RenderedDoc
                  content={activeExample.content}
                  fileId={activeExample.id}
                  name={`${activeExample.id}.md`}
                />
              )}
            </div>
          ) : (
            <div className="p-6 text-muted-foreground">Select an example.</div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * "Open as remote URL" affordances next to each example.
 *
 * Two buttons, both pointing at the demo file served from
 * /demo-files/<filename> with the right MIME (text/markdown for .md, etc.).
 *
 *   ↗ — opens in a new tab. With the Filemark extension installed and the
 *       "Render remote files" toggle enabled, the new tab will render with
 *       Filemark over the raw file — handy for testing the remote-URL path.
 *   🔗 — copies the absolute URL to the clipboard for sharing or pasting
 *       into the extension's address bar manually.
 */
function DemoFileLinks({ filename }: { filename: string }) {
  const [copied, setCopied] = useState(false);
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const path = `${base}/demo-files/${filename}`;
  const absolute =
    typeof window !== "undefined" ? new URL(path, window.location.origin).toString() : path;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard denied — silent; the link is still openable via the ↗ icon */
    }
  };

  return (
    <>
      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background px-2 font-medium text-muted-foreground transition-colors hover:text-foreground"
        title="Open the raw file URL in a new tab — with the Filemark extension installed, this is how a remote .md / .json / .sql file renders in place"
      >
        <ExternalLink size={12} />
        <span className="hidden sm:inline">Open URL</span>
      </a>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background px-2 font-medium text-muted-foreground transition-colors hover:text-foreground"
        title={`Copy ${absolute}`}
      >
        <Link2 size={12} />
        <span className="hidden sm:inline">{copied ? "Copied ✓" : "Copy URL"}</span>
      </button>
    </>
  );
}

function Group({
  section,
  Icon,
  items,
  activeId,
  onPick,
}: {
  section: string;
  Icon: typeof Table2;
  items: { id: string; title: string; description: string }[];
  activeId: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
        <Icon size={11} className="opacity-70" aria-hidden />
        <span>{section}</span>
      </div>
      <ul>
        {items.map((ex) => {
          const active = activeId === ex.id;
          return (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => onPick(ex.id)}
                className={[
                  "group relative flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition-colors",
                  active
                    ? "bg-sidebar-accent/80 text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent/40",
                ].join(" ")}
                title={ex.description}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
                  />
                )}
                <span className="truncate font-medium leading-tight">
                  {ex.title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function tabButton(active: boolean) {
  return [
    "rounded px-2.5 py-0.5 text-[11px] font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:text-foreground",
  ].join(" ");
}

function DropTarget({
  onDrop,
}: {
  onDrop: (doc: { name: string; content: string }) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setHover(false);
        const f = e.dataTransfer.files[0];
        if (!f) return;
        const text = await f.text();
        onDrop({ name: f.name, content: text });
      }}
      className={[
        "m-3 flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-[11px] transition-colors",
        hover
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-sidebar-border text-muted-foreground hover:border-sidebar-border hover:bg-sidebar-accent/40 hover:text-foreground",
      ].join(" ")}
    >
      <input
        type="file"
        accept=".md,.mdx,.markdown,text/markdown,.txt"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const text = await f.text();
          onDrop({ name: f.name, content: text });
        }}
      />
      <Upload size={13} className="shrink-0 opacity-70" aria-hidden />
      <span className="min-w-0">
        <span className="block truncate font-medium">Drop a .md file</span>
        <span className="block truncate opacity-70">or click to pick</span>
      </span>
    </label>
  );
}
