import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ThemeProvider,
  DEFAULT_THEME,
  type ThemeSettings,
  type ViewerProps,
} from "@filemark/core";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { json } from "@codemirror/lang-json";
import {
  PanelLeft,
  List,
  Settings as SettingsIcon,
  FolderOpen,
  Search,
  Pencil,
  Eye,
  Save,
  BookOpen,
  Maximize2,
  FileCode,
  FileText,
  ExternalLink,
  FolderSymlink,
  Pencil as RenameIcon,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  X as XIcon,
} from "lucide-react";
import { JSONViewer } from "@filemark/json";
import { sqlStorage } from "./adapters/sqlStorage";
import { makeFsAssets } from "./adapters/fsAssets";
import { getRenderer } from "./registry";
import { SearchPalette } from "./SearchPalette";
import { TabStrip } from "./TabStrip";
import { ThemePopover } from "./ThemePopover";
import { SidebarResizer, SIDEBAR_DEFAULT_WIDTH } from "./SidebarResizer";
import {
  SettingsPanel,
  DEFAULT_SETTINGS,
  type Settings,
  type FormatId,
} from "./SettingsPanel";
import { useStore, type FileEntry } from "./store";

const THEME_KEY = "lib:theme";
const UI_KEY = "lib:ui";
const SETTINGS_KEY = "lib:settings";
const isMac = window.filemark?.platform === "darwin";

interface UIPrefs {
  sidebar: boolean;
  toc: boolean;
  fullscreen: boolean;
  readingMode: boolean;
  raw: boolean;
  sidebarWidth: number;
}
const DEFAULT_UI: UIPrefs = {
  sidebar: true,
  toc: false, // off by default — opening another panel-like aside next
              // to the sidebar reads as two sidebars. User opens via \\.
  fullscreen: false,
  readingMode: false,
  raw: false,
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
};

function IconBtn({
  title,
  onClick,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`app-no-drag grid h-8 w-8 place-items-center rounded-md transition-colors ${
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function App(): React.ReactElement {
  const [theme, setThemeState] = useState<ThemeSettings>(DEFAULT_THEME);
  useEffect(() => {
    void sqlStorage
      .get<ThemeSettings>(THEME_KEY)
      .then((t) => t && setThemeState({ ...DEFAULT_THEME, ...t }));
  }, []);
  const setTheme = useCallback((t: ThemeSettings) => {
    setThemeState(t);
    void sqlStorage.set(THEME_KEY, t);
  }, []);
  return (
    <ThemeProvider value={theme} onChange={setTheme}>
      <Shell theme={theme} setTheme={setTheme} />
    </ThemeProvider>
  );
}

// Treat plain-key shortcuts (R / F / X / digits / [ / ] / /) as non-firing
// when the user is typing in an input — matches chrome-ext guard.
function inEditable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

function Shell({
  theme,
  setTheme,
}: {
  theme: ThemeSettings;
  setTheme: (t: ThemeSettings) => void;
}): React.ReactElement {
  const {
    projects,
    files,
    activeId,
    openTabs,
    hydrate,
    setProjects,
    open,
    setActive,
    closeTab,
  } = useStore();
  const active: FileEntry | null = activeId ? files[activeId] ?? null : null;

  const [ui, setUi] = useState<UIPrefs>(DEFAULT_UI);
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [palette, setPalette] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("");
  const activeRef = useRef<FileEntry | null>(null);
  const mtimeRef = useRef<number | null>(null);
  const scrollEl = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  activeRef.current = active;

  // Persisted UI prefs (lib:ui matches chrome-ext key).
  useEffect(() => {
    void sqlStorage.get<UIPrefs>(UI_KEY).then((u) =>
      u && setUi((cur) => ({ ...cur, ...u })),
    );
    void sqlStorage.get<Settings>(SETTINGS_KEY).then((s) => {
      if (!s) return;
      // Deep-merge with defaults so missing fields from older shapes hydrate.
      setSettingsState({
        formats: { ...DEFAULT_SETTINGS.formats, ...(s.formats ?? {}) },
        json: { ...DEFAULT_SETTINGS.json, ...(s.json ?? {}) },
      });
    });
  }, []);
  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    void sqlStorage.set(SETTINGS_KEY, s);
  }, []);
  const patchUi = useCallback((p: Partial<UIPrefs>) => {
    setUi((cur) => {
      const next = { ...cur, ...p };
      void sqlStorage.set(UI_KEY, next);
      return next;
    });
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!active) {
      setContent("");
      return;
    }
    let live = true;
    (async () => {
      const text = await window.filemark.files.read(
        active.rootPath,
        active.relPath,
      );
      mtimeRef.current = await window.filemark.files.mtime(
        active.rootPath,
        active.relPath,
      );
      if (!live) return;
      setEditing(false);
      setContent(text ?? `*Could not read ${active.relPath}*`);
      const top = await sqlStorage.get<number>(`scroll:${active.id}`);
      requestAnimationFrame(() => {
        if (scrollEl.current) scrollEl.current.scrollTop = top ?? 0;
      });
    })();
    return () => {
      live = false;
    };
  }, [active]);

  const reload = useCallback(async () => {
    setProjects(await window.filemark.projects.list());
  }, [setProjects]);

  useEffect(() => {
    return window.filemark.onFilesChanged((paths) => {
      const a = activeRef.current;
      if (a && !editing && paths.some((p) => p.endsWith(a.relPath))) {
        void window.filemark.files
          .read(a.rootPath, a.relPath)
          .then((t) => t != null && setContent(t));
      } else void reload();
    });
  }, [reload, editing]);

  const save = useCallback(async () => {
    const a = activeRef.current;
    if (!a) return;
    const disk = await window.filemark.files.mtime(a.rootPath, a.relPath);
    if (disk != null && mtimeRef.current != null && disk > mtimeRef.current) {
      if (!confirm("File changed on disk since you opened it. Overwrite?"))
        return;
    }
    const m = await window.filemark.files.write(a.rootPath, a.relPath, draft);
    if (m != null) {
      mtimeRef.current = m;
      setContent(draft);
      setEditing(false);
    }
  }, [draft]);

  // Full chrome-ext shortcut catalog (11 commands).
  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      const mod = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const editable = inEditable(e.target);

      // Modifier combos work even when focused in inputs (⌘K/⌘B/⌘S/⌘E).
      if (mod && e.code === "KeyK") {
        e.preventDefault();
        setPalette((v) => !v);
        return;
      }
      if (mod && e.code === "KeyB") {
        e.preventDefault();
        patchUi({ sidebar: !ui.sidebar });
        return;
      }
      if (mod && e.code === "KeyE" && active) {
        e.preventDefault();
        setDraft(content);
        setEditing((v) => !v);
        return;
      }
      if (mod && e.code === "KeyS" && editing) {
        e.preventDefault();
        void save();
        return;
      }
      if (e.key === "Escape") {
        if (palette) setPalette(false);
        else if (ui.fullscreen) patchUi({ fullscreen: false });
        else if (ui.readingMode) patchUi({ readingMode: false });
        return;
      }

      // Plain-key shortcuts — guard against typing in inputs.
      if (editable || mod) return;

      if (e.code === "Backslash") {
        e.preventDefault();
        patchUi({ toc: !ui.toc });
      } else if (e.code === "KeyF" && shift) {
        e.preventDefault();
        patchUi({ readingMode: !ui.readingMode });
      } else if (e.code === "KeyF") {
        e.preventDefault();
        patchUi({ fullscreen: !ui.fullscreen });
      } else if (e.code === "KeyR" && active) {
        e.preventDefault();
        patchUi({ raw: !ui.raw });
      } else if (e.code === "Slash") {
        e.preventDefault();
        filterRef.current?.focus();
      } else if (e.code === "BracketRight" || e.code === "BracketLeft") {
        e.preventDefault();
        if (openTabs.length === 0) return;
        const i = openTabs.indexOf(activeId ?? "");
        const n =
          e.code === "BracketRight"
            ? (i + 1) % openTabs.length
            : (i - 1 + openTabs.length) % openTabs.length;
        setActive(openTabs[n]);
      } else if (e.code === "KeyX" && active) {
        e.preventDefault();
        closeTab(active.id);
      } else if (/^Digit[1-9]$/.test(e.code)) {
        const n = Number(e.code.slice(5)) - 1;
        if (openTabs[n]) {
          e.preventDefault();
          setActive(openTabs[n]);
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const addFolder = useCallback(async () => {
    if (await window.filemark.projects.open()) await reload();
  }, [reload]);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (await window.filemark.projects.add(window.filemark.pathForFile(file)))
        await reload();
    },
    [reload],
  );

  const fileAction = useCallback(
    async (
      f: FileEntry,
      act: "rename" | "trash" | "new" | "edit" | "reveal",
    ) => {
      if (act === "edit")
        return void window.filemark.os.openPath(f.rootPath, f.relPath);
      if (act === "reveal")
        return void window.filemark.os.reveal(f.rootPath, f.relPath);
      if (act === "rename") {
        const to = prompt("New relative path", f.relPath);
        if (to && to !== f.relPath) {
          await window.filemark.files.rename(f.rootPath, f.relPath, to);
          await reload();
        }
      } else if (act === "trash") {
        if (confirm(`Move ${f.relPath} to Trash?`)) {
          await window.filemark.files.trash(f.rootPath, f.relPath);
          closeTab(f.id);
          await reload();
        }
      } else if (act === "new") {
        const rel = prompt("New file relative path (e.g. notes/todo.md)");
        if (rel) {
          await window.filemark.files.create(f.rootPath, rel);
          await reload();
        }
      }
    },
    [reload, closeTab],
  );

  // Format toggle (settings.formats) gates rendering: a disabled ext
  // resolves to no Renderer, showing the "Disabled in Settings" state.
  const formatOn = active
    ? settings.formats[active.ext as FormatId] !== false
    : true;
  const Renderer = active && formatOn ? getRenderer(active.ext) : null;
  const assets = useMemo(
    () =>
      active
        ? makeFsAssets(
            active.rootPath,
            active.relPath.split("/").slice(0, -1).join("/"),
          )
        : undefined,
    [active],
  );
  const vp: ViewerProps | null =
    active && Renderer
      ? {
          content,
          file: { id: active.id, name: active.relPath, ext: active.ext },
          storage: sqlStorage,
          assets,
        }
      : null;

  // Reading mode hides sidebar + TOC but keeps topbar + tabs.
  // Fullscreen hides everything except the viewer.
  const showSidebar = ui.sidebar && !ui.readingMode && !ui.fullscreen;
  const showHeader = !ui.fullscreen;
  const showTabs = !ui.fullscreen;
  const showRaw = ui.raw && active && !editing;

  const cmLang = active?.ext === "json" ? json() : markdown();

  return (
    <div
      className="flex h-full flex-col bg-background text-foreground"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {showHeader && (
        <header
          className={`app-drag flex h-11 items-center gap-1 border-b border-border bg-background/60 pr-3 backdrop-blur-md ${
            isMac ? "pl-20" : "pl-3"
          }`}
        >
          <IconBtn
            title="Toggle sidebar (⌘B)"
            onClick={() => patchUi({ sidebar: !ui.sidebar })}
            active={ui.sidebar}
          >
            <PanelLeft size={16} />
          </IconBtn>
          <IconBtn title="Open folder" onClick={addFolder}>
            <FolderOpen size={16} />
          </IconBtn>
          <IconBtn title="Search (⌘K)" onClick={() => setPalette(true)}>
            <Search size={16} />
          </IconBtn>
          <div className="app-drag mx-2 flex-1 select-none text-center text-xs font-medium text-muted-foreground">
            {active ? active.relPath.split("/").pop() : "Filemark"}
          </div>
          {active && (
            <IconBtn
              title="Toggle raw source (R)"
              onClick={() => patchUi({ raw: !ui.raw })}
              active={ui.raw}
            >
              <FileCode size={16} />
            </IconBtn>
          )}
          {active && (
            <IconBtn
              title={editing ? "Preview (⌘E)" : "Edit (⌘E)"}
              onClick={() => {
                setDraft(content);
                setEditing((v) => !v);
              }}
              active={editing}
            >
              {editing ? <Eye size={16} /> : <Pencil size={16} />}
            </IconBtn>
          )}
          {editing && (
            <IconBtn title="Save (⌘S)" onClick={() => void save()}>
              <Save size={16} />
            </IconBtn>
          )}
          <IconBtn
            title="Reading mode (⇧F)"
            onClick={() => patchUi({ readingMode: !ui.readingMode })}
            active={ui.readingMode}
          >
            <BookOpen size={16} />
          </IconBtn>
          <IconBtn
            title="Fullscreen (F)"
            onClick={() => patchUi({ fullscreen: !ui.fullscreen })}
            active={ui.fullscreen}
          >
            <Maximize2 size={16} />
          </IconBtn>
          <IconBtn
            title="Toggle TOC (\\)"
            onClick={() => patchUi({ toc: !ui.toc })}
            active={ui.toc}
          >
            <List size={16} />
          </IconBtn>
          <ThemePopover theme={theme} setTheme={setTheme} />
          <IconBtn title="Settings" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon size={16} />
          </IconBtn>
        </header>
      )}

      <div className="flex min-h-0 flex-1">
        {showSidebar && (
          <aside
            ref={sidebarRef}
            style={{ width: ui.sidebarWidth }}
            className="flex shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar/70 backdrop-blur-md"
          >
            <div className="p-2">
              <div className="relative">
                <input
                  ref={filterRef}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter files (/)"
                  className="h-7 w-full rounded-md border border-border bg-background/60 px-2 text-[12px] outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-ring"
                />
                {filter && (
                  <button
                    onClick={() => setFilter("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <XIcon size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto px-2 pb-2">
              {projects.length === 0 && (
                <div className="mt-10 px-3 text-center">
                  <FolderOpen
                    size={28}
                    className="mx-auto mb-3 text-muted-foreground/60"
                  />
                  <p className="text-sm text-sidebar-foreground/70">
                    Drag a folder here, or
                  </p>
                  <button
                    onClick={addFolder}
                    className="app-no-drag mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                  >
                    Open Folder
                  </button>
                </div>
              )}
              {projects.map((p) => {
                const q = filter.trim().toLowerCase();
                const visible = q
                  ? p.files.filter((f) => f.relPath.toLowerCase().includes(q))
                  : p.files;
                if (q && visible.length === 0) return null;
                return (
                  <div key={p.id} className="mb-1">
                    <button
                      onClick={() =>
                        setCollapsed((c) => ({ ...c, [p.id]: !c[p.id] }))
                      }
                      className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-sidebar-accent"
                    >
                      {collapsed[p.id] ? (
                        <ChevronRight size={13} />
                      ) : (
                        <ChevronDown size={13} />
                      )}
                      <span className="truncate">{p.name}</span>
                      <span className="ml-auto text-[10px] opacity-60">
                        {visible.length}
                      </span>
                    </button>
                    {!collapsed[p.id] &&
                      visible.map((f) => {
                        const fe = files[f.id];
                        const on = activeId === f.id;
                        return (
                          <div
                            key={f.id}
                            className="group flex items-center pl-2"
                          >
                            <button
                              onClick={() => open(f.id)}
                              title={f.relPath}
                              className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] transition-colors ${
                                on
                                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                              }`}
                            >
                              <FileText
                                size={13}
                                className="shrink-0 opacity-60"
                              />
                              <span className="truncate">
                                {f.relPath.split("/").pop()}
                              </span>
                            </button>
                            {fe && (
                              <span className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {(
                                  [
                                    ["edit", ExternalLink, "Open in editor"],
                                    ["reveal", FolderSymlink, "Reveal"],
                                    ["rename", RenameIcon, "Rename"],
                                    ["new", Plus, "New file"],
                                    ["trash", Trash2, "Trash"],
                                  ] as const
                                ).map(([act, Icon, label]) => (
                                  <button
                                    key={act}
                                    title={label}
                                    onClick={() => fileAction(fe, act)}
                                    className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                                  >
                                    <Icon size={12} />
                                  </button>
                                ))}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </aside>
        )}
        {showSidebar && (
          <SidebarResizer
            targetRef={sidebarRef}
            initialWidth={ui.sidebarWidth}
            onCommit={(w) => patchUi({ sidebarWidth: w })}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col bg-background">
          {showTabs && <TabStrip />}
          <div className="flex min-h-0 flex-1">
            <main
              ref={scrollEl}
              onScroll={(e) => {
                const a = activeRef.current;
                if (a && !editing)
                  void sqlStorage.set(
                    `scroll:${a.id}`,
                    (e.target as HTMLDivElement).scrollTop,
                  );
              }}
              className="min-w-0 flex-1 overflow-auto"
            >
              {editing && active ? (
                <CodeMirror
                  value={draft}
                  height="100%"
                  theme={theme.mode === "dark" ? "dark" : "light"}
                  extensions={[cmLang]}
                  onChange={setDraft}
                />
              ) : showRaw && active ? (
                <CodeMirror
                  value={content}
                  height="100%"
                  editable={false}
                  theme={theme.mode === "dark" ? "dark" : "light"}
                  extensions={[cmLang]}
                />
              ) : vp && Renderer ? (
                <div
                  className="mx-auto px-8 py-12"
                  data-toc={ui.toc ? "open" : "closed"}
                  style={{
                    maxWidth: "calc(var(--fv-content-width, 760px) + 4rem)",
                  }}
                >
                  {/* JSON viewer needs its options from settings — route
                      directly so theme/depth/clipboard etc. apply. */}
                  {active && (active.ext === "json" || active.ext === "jsonc") ? (
                    <JSONViewer {...vp} options={settings.json} />
                  ) : (
                    <Renderer {...vp} />
                  )}
                </div>
              ) : (
                <div className="grid h-full place-items-center">
                  <div className="text-center">
                    <FileText
                      size={40}
                      className="mx-auto mb-4 text-muted-foreground/40"
                    />
                    <p className="text-sm text-muted-foreground">
                      {active && !formatOn
                        ? `.${active.ext} rendering is disabled in Settings`
                        : active
                          ? `No renderer for .${active.ext}`
                          : "Select a file to preview"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Press{" "}
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">
                        ⌘K
                      </kbd>{" "}
                      to search
                    </p>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {palette && (
        <SearchPalette
          projects={projects}
          onClose={() => setPalette(false)}
          onPick={(f) => {
            setPalette(false);
            open(f.id);
          }}
        />
      )}
      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
