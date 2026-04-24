import { useMemo, useState, useEffect } from "react";
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, FileText, RotateCw, Search, Star, Trash2, X } from "lucide-react";
import { useLibrary, type LibraryFile } from "../store";
import { restoreFolder } from "../fs";
import { sessionHandles } from "../sessionHandles";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FolderRootPath } from "./FolderRootPath";
import { cn } from "@/lib/utils";

type TreeNode =
  | { kind: "folder"; name: string; path: string; children: TreeNode[] }
  | { kind: "file"; file: LibraryFile };

export function Sidebar() {
  const files = useLibrary((s) => s.files);
  const folders = useLibrary((s) => s.folders);
  const activeId = useLibrary((s) => s.activeFileId);
  const setActive = useLibrary((s) => s.setActive);
  const recent = useLibrary((s) => s.recentIds);
  const sessionRev = useLibrary((s) => s.sessionRev);
  const removeFile = useLibrary((s) => s.removeFile);
  const removeFolder = useLibrary((s) => s.removeFolder);
  const rescanFolder = useLibrary((s) => s.rescanFolder);
  const clearAll = useLibrary((s) => s.clearAll);
  const clearRecent = useLibrary((s) => s.clearRecent);
  const clearDropped = useLibrary((s) => s.clearDropped);
  const collapsed = useLibrary((s) => s.sidebarTreeCollapsed);
  const setTreeCollapsed = useLibrary((s) => s.setSidebarTreeCollapsed);
  const sectionOpen = useLibrary((s) => s.sidebarSections);
  const setSectionOpen = useLibrary((s) => s.setSidebarSection);
  const setSidebarCollapseState = useLibrary((s) => s.setSidebarCollapseState);
  const revealRequest = useLibrary((s) => s.revealRequest);
  const [needsPermission, setNeedsPermission] = useState<Record<string, boolean>>({});
  const [folderQuery, setFolderQuery] = useState<Record<string, string>>({});

  const starred = useMemo(
    () => Object.values(files).filter((f) => f.starred),
    [files]
  );

  const folderTrees = useMemo(() => {
    return Object.values(folders).map((folder) => {
      const folderFiles = Object.values(files).filter(
        (f) => f.folderId === folder.id
      );
      return {
        folder,
        tree: buildTree(folderFiles),
        count: folderFiles.length,
      };
    });
  }, [folders, files]);

  // Count how many folders share each name. When a name appears more
  // than once (common when dropping multiple `docs/` from different
  // repos), we disambiguate with the parent dir of rootPath in the
  // section title. Otherwise titles stay clean.
  const folderNameCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of Object.values(folders)) {
      counts[f.name] = (counts[f.name] ?? 0) + 1;
    }
    return counts;
  }, [folders]);

  // Same idea for files — when two `SKILL.md` (or `README.md`) end up
  // in Recent / Starred / Dropped, the rows are indistinguishable. Only
  // tag rows whose name appears more than once across the whole library.
  const fileNameCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of Object.values(files)) {
      counts[f.name] = (counts[f.name] ?? 0) + 1;
    }
    return counts;
  }, [files]);

  const fileSubtitleFor = (file: LibraryFile): string | undefined => {
    if ((fileNameCounts[file.name] ?? 0) <= 1) return undefined;

    // (1) file:// intercept or Finder drag-drop with text/uri-list:
    //     sourceUrl holds the absolute path. Show the last 2 parent
    //     segments — enough to identify which repo the file is from.
    if (file.sourceUrl && file.sourceUrl.startsWith("file://")) {
      try {
        const abs = decodeURIComponent(new URL(file.sourceUrl).pathname);
        const segs = abs.split("/").filter(Boolean);
        const parent = segs.slice(-3, -1).join("/"); // last 2 dirs above filename
        if (parent) return parent;
      } catch {
        /* fall through */
      }
    }

    // (2) Inside a library folder — show folder + relative parent path.
    const folderName = file.folderId
      ? folders[file.folderId]?.name
      : undefined;
    const segs = file.path.split("/").filter(Boolean);
    const parent = segs.slice(0, -1).join("/");
    if (folderName && parent) return `${folderName}/${parent}`;
    if (folderName) return folderName;
    if (parent) return parent;

    // (3) True loose drop with no path metadata — distinguish by size +
    //     drop time so at least the row isn't a literal dupe.
    const sizeKb = file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "";
    const ts = file.lastOpenedAt
      ? new Date(file.lastOpenedAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    const tail = [sizeKb, ts].filter(Boolean).join(" · ");
    return tail || "Dropped";
  };

  const orphanFiles = useMemo(
    () => Object.values(files).filter((f) => !f.folderId),
    [files]
  );

  useEffect(() => {
    const missing: Record<string, boolean> = {};
    for (const f of Object.values(folders)) {
      // Drop-folders live entirely in IndexedDB — no FS handle to reconnect.
      if (f.kind === "drop") continue;
      if (!sessionHandles.has(f.id)) missing[f.id] = true;
    }
    setNeedsPermission(missing);
  }, [folders, sessionRev]);

  // Reveal active file in sidebar — driven by store.revealRequest counter.
  // The store opens the right sections + uncollapses parent folders before
  // bumping the counter, so by the time this effect runs React has rendered
  // the new tree state and the row exists in the DOM. rAF gives the browser
  // one paint to lay out the rows so scrollIntoView lands on the final pos.
  useEffect(() => {
    if (revealRequest === 0) return;
    if (!activeId) return;
    const id = activeId;
    requestAnimationFrame(() => {
      const row = document.querySelector(
        `[data-file-id="${CSS.escape(id)}"]`
      ) as HTMLElement | null;
      if (!row) return;
      row.scrollIntoView({ block: "center", behavior: "smooth" });
      row.classList.add("fv-row-flash");
      setTimeout(() => row.classList.remove("fv-row-flash"), 1200);
    });
  }, [revealRequest, activeId]);

  const reconnect = async (folderId: string) => {
    const folder = useLibrary.getState().folders[folderId];
    if (!folder) return;
    const res = await restoreFolder(folder);
    if (res) {
      sessionHandles.register(folder.id, res.handle, res.fileHandles);
      setNeedsPermission((p) => ({ ...p, [folderId]: false }));
      useLibrary.setState((s) => ({ sessionRev: s.sessionRev + 1 }));
    }
  };

  const isEmpty =
    Object.keys(files).length === 0 && Object.keys(folders).length === 0;

  const getSectionOpen = (key: string) => sectionOpen[key] ?? true;

  const collapseAll = () => {
    const nextSection: Record<string, boolean> = { ...sectionOpen };
    if (starred.length) nextSection["starred"] = false;
    if (recent.length) nextSection["recent"] = false;
    for (const { folder } of folderTrees)
      nextSection[`folder:${folder.id}`] = false;
    if (orphanFiles.length) nextSection["orphans"] = false;

    // Also collapse every nested folder node inside every folder tree.
    const nextCollapsed: Record<string, boolean> = { ...collapsed };
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.kind === "folder") {
          nextCollapsed[n.path] = true;
          walk(n.children);
        }
      }
    };
    for (const t of folderTrees) walk(t.tree);

    setSidebarCollapseState(nextSection, nextCollapsed);
  };

  const expandAll = () => {
    const nextSection: Record<string, boolean> = { ...sectionOpen };
    if (starred.length) nextSection["starred"] = true;
    if (recent.length) nextSection["recent"] = true;
    for (const { folder } of folderTrees)
      nextSection[`folder:${folder.id}`] = true;
    if (orphanFiles.length) nextSection["orphans"] = true;

    const nextCollapsed: Record<string, boolean> = { ...collapsed };
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.kind === "folder") {
          nextCollapsed[n.path] = false;
          walk(n.children);
        }
      }
    };
    for (const t of folderTrees) walk(t.tree);

    setSidebarCollapseState(nextSection, nextCollapsed);
  };

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-full w-64 shrink-0 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0.5 py-2">
          {isEmpty && (
            <div className="text-muted-foreground px-3 py-4 text-xs leading-relaxed">
              <div className="text-sidebar-foreground mb-1 text-[13px] font-medium">
                No files yet
              </div>
              Drag &amp; drop a{" "}
              <code className="bg-muted rounded px-1 py-0.5 text-[11px]">
                .md
              </code>{" "}
              or{" "}
              <code className="bg-muted rounded px-1 py-0.5 text-[11px]">
                .mdx
              </code>{" "}
              file, or click <b>Open Folder</b>.
            </div>
          )}

          {starred.length > 0 && (
            <Section
              title="Starred"
              open={getSectionOpen("starred")}
              onOpenChange={(v) => setSectionOpen("starred", v)}
            >
              {starred.map((f) => (
                <FileRow
                  key={f.id}
                  file={f}
                  active={f.id === activeId}
                  onClick={() => setActive(f.id)}
                  onRemove={() => removeFile(f.id)}
                  subtitle={fileSubtitleFor(f)}
                />
              ))}
            </Section>
          )}

          {recent.length > 0 && (
            <Section
              title="Recent"
              open={getSectionOpen("recent")}
              onOpenChange={(v) => setSectionOpen("recent", v)}
              onRemove={() => clearRecent()}
              removeLabel="Clear recent list"
            >
              {recent
                .map((id) => files[id])
                .filter(Boolean)
                .slice(0, 8)
                .map((f) => (
                  <FileRow
                    key={f.id}
                    file={f}
                    active={f.id === activeId}
                    onClick={() => setActive(f.id)}
                    onRemove={() => removeFile(f.id)}
                    subtitle={fileSubtitleFor(f)}
                  />
                ))}
            </Section>
          )}

          {folderTrees.map(({ folder, tree, count }) => (
            <Section
              key={folder.id}
              title={
                folderNameCounts[folder.name] > 1
                  ? `${folder.name} (${parentDirOf(folder.rootPath) ?? folder.id.slice(0, 6)})`
                  : folder.name
              }
              badge={String(count)}
              open={getSectionOpen(`folder:${folder.id}`)}
              onOpenChange={(v) => setSectionOpen(`folder:${folder.id}`, v)}
              onRescan={
                folder.kind === "fsa" && !needsPermission[folder.id]
                  ? async () => {
                      await rescanFolder(folder.id);
                    }
                  : undefined
              }
              rescanLabel={`Rescan ${folder.name} for changes on disk`}
              onRemove={() => {
                if (
                  confirm(
                    `Remove folder "${folder.name}" from the library?\n\n${count} file${count === 1 ? "" : "s"} will be removed. The files on disk are not touched.`
                  )
                )
                  removeFolder(folder.id);
              }}
            >
              {needsPermission[folder.id] && (
                <div className="px-2 pb-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-full justify-start gap-1.5 px-2 text-xs font-normal"
                    onClick={() => reconnect(folder.id)}
                  >
                    <RotateCw className="size-3" />
                    Reconnect folder
                  </Button>
                </div>
              )}
              <FolderRootPath folder={folder} />
              <FolderQuickFilter
                value={folderQuery[folder.id] ?? ""}
                onChange={(v) =>
                  setFolderQuery((q) => ({ ...q, [folder.id]: v }))
                }
                total={count}
              />
              {(() => {
                const q = (folderQuery[folder.id] ?? "").trim().toLowerCase();
                if (!q) {
                  return tree.map((node, i) => (
                    <TreeRow
                      key={i}
                      node={node}
                      depth={0}
                      activeId={activeId}
                      collapsed={collapsed}
                      onToggle={(p) => setTreeCollapsed(p, !collapsed[p])}
                      onClick={(id) => setActive(id)}
                      onRemove={(id) => removeFile(id)}
                    />
                  ));
                }
                const folderFiles = Object.values(files).filter(
                  (f) =>
                    f.folderId === folder.id &&
                    (f.name.toLowerCase().includes(q) ||
                      f.path.toLowerCase().includes(q))
                );
                if (folderFiles.length === 0) {
                  return (
                    <div className="text-muted-foreground px-3 py-2 text-[11px] italic">
                      No matches in this folder
                    </div>
                  );
                }
                return folderFiles.slice(0, 200).map((f) => (
                  <FileRow
                    key={f.id}
                    file={f}
                    active={f.id === activeId}
                    onClick={() => setActive(f.id)}
                    onRemove={() => removeFile(f.id)}
                    subtitle={pathContext(f.path)}
                  />
                ));
              })()}
            </Section>
          ))}

          {orphanFiles.length > 0 && (
            <Section
              title="Dropped files"
              open={getSectionOpen("orphans")}
              onOpenChange={(v) => setSectionOpen("orphans", v)}
              badge={String(orphanFiles.length)}
              onRemove={() => {
                if (
                  confirm(
                    `Remove all ${orphanFiles.length} dropped file${orphanFiles.length === 1 ? "" : "s"}?\n\nFiles on disk are not touched.`
                  )
                )
                  clearDropped();
              }}
              removeLabel="Remove all dropped files"
            >
              {orphanFiles.map((f) => (
                <FileRow
                  key={f.id}
                  file={f}
                  active={f.id === activeId}
                  onClick={() => setActive(f.id)}
                  onRemove={() => removeFile(f.id)}
                  subtitle={fileSubtitleFor(f)}
                />
              ))}
            </Section>
          )}
        </div>
      </ScrollArea>
      <Separator />
      <div className="flex items-center justify-between gap-1 px-2 py-1">
        <span className="text-muted-foreground px-1 text-[10px] tabular-nums">
          {Object.keys(files).length} file{Object.keys(files).length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-0.5">
          {!isEmpty && (
            <button
              className="text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent flex size-6 items-center justify-center rounded-sm transition-colors"
              onClick={expandAll}
              title="Expand all sections and nested folders"
              aria-label="Expand all"
            >
              <ChevronsUpDown className="size-3.5" />
            </button>
          )}
          {!isEmpty && (
            <button
              className="text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent flex size-6 items-center justify-center rounded-sm transition-colors"
              onClick={collapseAll}
              title="Collapse all sections and nested folders"
              aria-label="Collapse all"
            >
              <ChevronsDownUp className="size-3.5" />
            </button>
          )}
          {!isEmpty && (
            <button
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex size-6 items-center justify-center rounded-sm transition-colors"
              onClick={() => {
                if (
                  confirm(
                    "Clear everything from the library?\n\nAll files, folders, tags, stars, and root-path assignments will be removed. Files on disk are not touched."
                  )
                )
                  clearAll();
              }}
              title="Clear all entries from the library"
              aria-label="Clear all"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function RescanButton({
  onRescan,
  label,
}: {
  onRescan: () => void | Promise<void>;
  label: string;
}) {
  const [spinning, setSpinning] = useState(false);
  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpinning(true);
    try {
      await onRescan();
    } finally {
      // Keep the spin on for a beat so the click is visible even when
      // the rescan is effectively instant.
      setTimeout(() => setSpinning(false), 350);
    }
  };
  return (
    <button
      className="hover:text-sidebar-foreground text-muted-foreground opacity-0 transition-opacity group-hover/section:opacity-100 data-[spinning=true]:opacity-100"
      data-spinning={spinning}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <RotateCw
        className={cn(
          "size-3 transition-transform",
          spinning && "animate-spin",
        )}
      />
    </button>
  );
}

function Section({
  title,
  badge,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  onRemove,
  removeLabel,
  onRescan,
  rescanLabel,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  /** Controlled open state. When set, `onOpenChange` is required. */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  onRemove?: () => void;
  removeLabel?: string;
  /** Optional "rescan" action; renders a refresh icon in the header. */
  onRescan?: () => void | Promise<void>;
  rescanLabel?: string;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const toggle = () => {
    if (onOpenChange) onOpenChange(!open);
    else setUncontrolledOpen((v) => !v);
  };
  return (
    <div className="group/section mb-1">
      <div className="hover:text-sidebar-foreground text-muted-foreground flex w-full items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider">
        <button
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={toggle}
        >
          <ChevronRight
            className={cn(
              "size-3 shrink-0 transition-transform duration-150",
              open && "rotate-90"
            )}
          />
          <span className="flex-1 truncate normal-case">{title}</span>
          {badge && (
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-[9px] font-medium"
            >
              {badge}
            </Badge>
          )}
        </button>
        {onRescan && (
          <RescanButton
            onRescan={onRescan}
            label={rescanLabel ?? `Rescan ${title} for changes on disk`}
          />
        )}
        {onRemove && (
          <button
            className="hover:text-destructive opacity-0 transition-opacity group-hover/section:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label={removeLabel ?? `Remove ${title}`}
            title={removeLabel ?? `Remove ${title} from library`}
          >
            <Trash2 className="size-3" />
          </button>
        )}
      </div>
      {open && <div className="mt-0.5 flex flex-col gap-px">{children}</div>}
    </div>
  );
}

function FileRow({
  file,
  active,
  onClick,
  onRemove,
  depth = 0,
  subtitle,
}: {
  file: LibraryFile;
  active: boolean;
  onClick: () => void;
  onRemove?: () => void;
  depth?: number;
  /** Optional subtitle — shown below the name in filter mode. */
  subtitle?: string;
}) {
  return (
    <div
      data-file-id={file.id}
      className={cn(
        "group/row text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-h-7 items-center gap-1.5 rounded-sm pr-1 text-[13px] leading-tight transition-colors",
        active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      )}
    >
      <button
        className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={onClick}
        title={file.path}
      >
        <FileText
          className={cn(
            "size-3.5 shrink-0",
            file.ext === "md" || file.ext === "mdx"
              ? "text-blue-400"
              : "text-muted-foreground"
          )}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{file.name}</span>
          {subtitle && (
            <span className="text-muted-foreground truncate text-[10px] leading-tight">
              {subtitle}
            </span>
          )}
        </div>
        {file.starred && (
          <Star className="size-3 shrink-0 fill-yellow-400 text-yellow-400" />
        )}
      </button>
      {onRemove && (
        <button
          className="hover:bg-destructive/20 hover:text-destructive text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-sm opacity-0 transition-opacity group-hover/row:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${file.name}`}
          title={`Remove ${file.name} from library`}
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  activeId,
  collapsed,
  onToggle,
  onClick,
  onRemove,
}: {
  node: TreeNode;
  depth: number;
  activeId: string | null;
  collapsed: Record<string, boolean>;
  onToggle: (path: string) => void;
  onClick: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  if (node.kind === "file") {
    return (
      <FileRow
        file={node.file}
        active={node.file.id === activeId}
        onClick={() => onClick(node.file.id)}
        onRemove={onRemove ? () => onRemove(node.file.id) : undefined}
        depth={depth}
      />
    );
  }
  const isClosed = collapsed[node.path];
  return (
    <div>
      <button
        className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-h-6 w-full items-center gap-1.5 rounded-sm py-1 pr-2 text-left text-[12px] leading-tight transition-colors"
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => onToggle(node.path)}
      >
        <ChevronRight
          className={cn(
            "size-3 shrink-0 transition-transform duration-150",
            !isClosed && "rotate-90"
          )}
        />
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {!isClosed &&
        node.children.map((c, i) => (
          <TreeRow
            key={i}
            node={c}
            depth={depth + 1}
            activeId={activeId}
            collapsed={collapsed}
            onToggle={onToggle}
            onClick={onClick}
            onRemove={onRemove}
          />
        ))}
    </div>
  );
}

function FolderQuickFilter({
  value,
  onChange,
  total,
}: {
  value: string;
  onChange: (v: string) => void;
  total: number;
}) {
  // Nothing to filter against — skip rendering the input entirely.
  if (total <= 1) return null;
  return (
    <div className="relative mx-2 mb-1">
      <Search className="text-muted-foreground pointer-events-none absolute left-1.5 top-1/2 size-3 -translate-y-1/2" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onChange("");
        }}
        placeholder={`Filter ${total} file${total === 1 ? "" : "s"}…`}
        className={cn(
          "bg-background placeholder:text-muted-foreground/60 focus-visible:border-ring h-6 w-full rounded-sm border pl-6 pr-6 text-[11px] outline-none"
        )}
      />
      {value && (
        <button
          className="hover:text-foreground text-muted-foreground absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-0.5"
          onClick={() => onChange("")}
          aria-label="Clear filter"
          title="Clear filter"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

/**
 * Render the directory portion of a file's relative path (everything before
 * the last slash). Used as a subtitle when showing flat filter results so
 * the user can distinguish two files with the same name in different dirs.
 */
function pathContext(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx > 0 ? path.slice(0, idx) : "";
}

function buildTree(files: LibraryFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  const folderMap = new Map<string, TreeNode & { kind: "folder" }>();

  for (const f of files.sort((a, b) => a.path.localeCompare(b.path))) {
    const parts = f.path.split("/");
    if (parts.length === 1) {
      root.push({ kind: "file", file: f });
      continue;
    }
    let parentList = root;
    let accPath = "";
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i];
      accPath = accPath ? `${accPath}/${name}` : name;
      let folder = folderMap.get(accPath);
      if (!folder) {
        folder = { kind: "folder", name, path: accPath, children: [] };
        folderMap.set(accPath, folder);
        parentList.push(folder);
      }
      parentList = folder.children;
    }
    parentList.push({ kind: "file", file: f });
  }
  return root;
}

/**
 * Last segment of a folder's parent dir, used to disambiguate two
 * folders that share the same `name` (e.g. multiple `docs` from
 * different repos). `/Volumes/.../filemark/docs` → `filemark`.
 * Returns null if there's no rootPath to derive from — caller falls
 * back to a short folder id.
 */
function parentDirOf(rootPath: string | undefined): string | null {
  if (!rootPath) return null;
  const segs = rootPath.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segs.length < 2) return null;
  return segs[segs.length - 2];
}
