import { useCallback, useEffect, useMemo, useState } from "react";
import { getExample, groupedExamples } from "./examples";
import { RenderedDoc } from "./RenderedDoc";
import { MonacoPane } from "./MonacoPane";

type ViewMode = "rendered" | "raw";

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
  useEffect(() => setActiveId(initialId), [initialId]);

  const activeExample = useMemo(() => getExample(activeId), [activeId]);
  const groups = useMemo(() => groupedExamples(), []);
  const showingUser = activeId === "__user__" && userDoc;

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
    <div className="flex h-full min-h-0 gap-px bg-border">
      <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex-1 overflow-auto py-1">
          {groups.map((group, gi) => (
            <div key={group.section} className={gi === 0 ? "" : "mt-2"}>
              <div className="px-3 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.section}
              </div>
              <ul>
                {group.items.map((ex) => {
                  const active = activeId === ex.id;
                  return (
                    <li key={ex.id}>
                      <button
                        type="button"
                        onClick={() => select(ex.id)}
                        className={[
                          "block w-full cursor-pointer px-3 py-2 text-left text-[12.5px] transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/50",
                        ].join(" ")}
                      >
                        <div className="truncate font-medium">{ex.title}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {ex.description}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {userDoc && (
            <div className="mt-2 border-t border-sidebar-border">
              <div className="px-3 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                Your file
              </div>
              <button
                type="button"
                onClick={() => select("__user__")}
                className={[
                  "block w-full cursor-pointer px-3 py-2 text-left text-[12.5px] transition-colors",
                  activeId === "__user__"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50",
                ].join(" ")}
              >
                <div className="truncate font-medium">{userDoc.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  Dropped / opened locally
                </div>
              </button>
            </div>
          )}
        </div>
        <DropTarget onDrop={onUserDrop} />
      </aside>
      <main className="flex flex-1 min-w-0 flex-col bg-background">
        {/* per-example toolbar — Rendered / Raw toggle + copy */}
        {(showingUser || activeExample) && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-1.5 text-[11.5px]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate font-medium text-foreground/80">
                {showingUser && userDoc ? userDoc.name : activeExample?.title}
              </span>
              <span className="font-mono text-[10.5px] text-muted-foreground truncate">
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
              </div>
              <button
                type="button"
                onClick={onCopy}
                className="h-6 rounded-md border border-border bg-background px-2 font-medium text-muted-foreground transition-colors hover:text-foreground"
                title="Copy the raw markdown source to clipboard"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-hidden">
          {mode === "raw" && (showingUser || activeExample) ? (
            <MonacoPane
              value={currentContent}
              readOnly
              language="markdown"
            />
          ) : showingUser && userDoc ? (
            <div className="h-full overflow-auto">
              <RenderedDoc
                content={userDoc.content}
                fileId="user-doc"
                name={userDoc.name}
              />
            </div>
          ) : activeExample ? (
            <div className="h-full overflow-auto">
              <RenderedDoc
                content={activeExample.content}
                fileId={activeExample.id}
                name={`${activeExample.id}.md`}
              />
            </div>
          ) : (
            <div className="p-6 text-muted-foreground">Select an example.</div>
          )}
        </div>
      </main>
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
        "cursor-pointer border-t border-sidebar-border px-3 py-2.5 text-[11px] text-muted-foreground transition-colors",
        hover ? "bg-primary/10 text-primary" : "hover:bg-sidebar-accent/50",
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
      <div className="font-medium">Drop a .md file here</div>
      <div className="opacity-70">or click to pick from your disk</div>
    </label>
  );
}
