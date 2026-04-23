import { useMemo, useState, useEffect } from "react";
import { ChevronRight, FileText, RotateCw, Search, Star, Trash2, X } from "lucide-react";
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
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

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex w-64 shrink-0 flex-col">
      <ScrollArea className="flex-1">
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
            <Section title="Starred" defaultOpen>
              {starred.map((f) => (
                <FileRow
                  key={f.id}
                  file={f}
                  active={f.id === activeId}
                  onClick={() => setActive(f.id)}
                  onRemove={() => removeFile(f.id)}
                />
              ))}
            </Section>
          )}

          {recent.length > 0 && (
            <Section
              title="Recent"
              defaultOpen
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
                  />
                ))}
            </Section>
          )}

          {folderTrees.map(({ folder, tree, count }) => (
            <Section
              key={folder.id}
              title={folder.name}
              badge={String(count)}
              defaultOpen
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
                      onToggle={(p) => setCollapsed((c) => ({ ...c, [p]: !c[p] }))}
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
              defaultOpen
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
                />
              ))}
            </Section>
          )}
        </div>
      </ScrollArea>
      <Separator />
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-muted-foreground px-1 text-[10px] tabular-nums">
          {Object.keys(files).length} file{Object.keys(files).length === 1 ? "" : "s"}
        </span>
        {!isEmpty && (
          <button
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] transition-colors"
            onClick={() => {
              if (
                confirm(
                  "Clear everything from the library?\n\nAll files, folders, tags, stars, and root-path assignments will be removed. Files on disk are not touched."
                )
              )
                clearAll();
            }}
            title="Clear all entries from the library"
          >
            <Trash2 className="size-3" />
            Clear all
          </button>
        )}
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
  onRemove,
  removeLabel,
  onRescan,
  rescanLabel,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  /** Optional "rescan" action; renders a refresh icon in the header. */
  onRescan?: () => void | Promise<void>;
  rescanLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="group/section mb-1">
      <div className="hover:text-sidebar-foreground text-muted-foreground flex w-full items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider">
        <button
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => setOpen((v) => !v)}
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
