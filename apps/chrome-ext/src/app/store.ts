import { create } from "zustand";
import { idbStorage } from "./adapters/idbStorage";
import type { ThemeSettings } from "@filemark/core";
import { DEFAULT_THEME } from "@filemark/core";

export interface LibraryFile {
  id: string;
  name: string;
  ext: string;
  path: string;
  folderId: string | null;
  size: number;
  starred?: boolean;
  tags?: string[];
  lastOpenedAt?: number;
  content?: string;
  /** Absolute URL when the file originated from a file:// interception. */
  sourceUrl?: string;
}

export interface LibraryFolder {
  id: string;
  name: string;
  /** Present only for the session; FS handles can't be serialized to JSON. */
  handle?: FileSystemDirectoryHandle;
  /** Live file handles keyed by file id — session only. */
  fileHandles?: Map<string, FileSystemFileHandle>;
  /** Serialized handle id for permission re-grant. */
  handleId: string;
  addedAt: number;
  /**
   * Absolute disk path of the folder. Chrome's FSA API intentionally hides
   * this; the user pastes it once to unlock "Open in editor" / "Reveal in
   * Finder". When present, children reconstruct absolute paths as
   * `rootPath + "/" + file.path`.
   */
  rootPath?: string;
  /**
   * "fsa" = picked via the Open Folder button, lives in a handle that the
   * user can reconnect. "drop" = dropped as a directory, contents were
   * read into memory and persisted; no handle, no reconnect dance.
   */
  kind?: "fsa" | "drop";
}

export interface LibraryState {
  files: Record<string, LibraryFile>;
  folders: Record<string, LibraryFolder>;
  /** The file rendered in the viewer right now. Also the id of the active tab. */
  activeFileId: string | null;
  /** Ordered list of open tabs (file ids). First click on a file adds it
   *  here; closing a tab removes it. */
  openTabs: string[];
  recentIds: string[];
  searchQuery: string;
  selectedTag: string | null;
  theme: ThemeSettings;
  sidebarOpen: boolean;
  tocOpen: boolean;
  hydrated: boolean;
  /** Incremented whenever live FSA handles come online or go away.
   *  Subscribers (Viewer, Sidebar) include this in their deps to retry. */
  sessionRev: number;
  /** Rendered (MDX) vs raw (syntax-highlighted source) view of the active file. */
  viewMode: "rendered" | "raw";
  /** Hides sidebar + topbar + TOC so the viewer fills the window. */
  fullscreen: boolean;
  /** When true, the Viewer re-reads the active file every `autoRefreshMs`. */
  autoRefresh: boolean;
  /** Interval in ms for autoRefresh. Default 2000. */
  autoRefreshMs: number;

  setActive(id: string | null): Promise<void>;
  closeTab(id: string): Promise<void>;
  nextTab(): void;
  prevTab(): void;
  reorderTabs(fromId: string, toId: string): void;
  addFiles(files: LibraryFile[]): Promise<void>;
  addFolder(folder: LibraryFolder, files: LibraryFile[]): Promise<void>;
  /**
   * Re-walk an FSA-backed folder on disk and reconcile the library —
   * picks up files added since the folder was dropped, drops files the
   * user has deleted. Noop for non-FSA folders or when the handle isn't
   * in sessionHandles (user hasn't re-granted permission this session).
   * Returns the number of files added and removed.
   */
  rescanFolder(folderId: string): Promise<{ added: number; removed: number }>;
  setFolderRootPath(folderId: string, rootPath: string): Promise<void>;
  toggleStar(id: string): Promise<void>;
  setTags(id: string, tags: string[]): Promise<void>;
  setSearchQuery(q: string): void;
  setSelectedTag(tag: string | null): void;
  setTheme(patch: Partial<ThemeSettings>): Promise<void>;
  resetTheme(): Promise<void>;
  toggleSidebar(): void;
  toggleToc(): void;
  toggleFullscreen(): void;
  toggleAutoRefresh(): void;
  setAutoRefreshMs(ms: number): void;
  setViewMode(mode: "rendered" | "raw"): void;
  removeFolder(folderId: string): Promise<void>;
  removeFile(fileId: string): Promise<void>;
  clearAll(): Promise<void>;
  clearRecent(): Promise<void>;
  clearDropped(): Promise<void>;
  hydrate(): Promise<void>;
}

const KEYS = {
  files: "lib:files",
  folders: "lib:folders",
  recent: "lib:recent",
  theme: "lib:theme",
  active: "lib:active",
  tabs: "lib:tabs",
  ui: "lib:ui",
};

interface UIPrefs {
  sidebarOpen: boolean;
  tocOpen: boolean;
  fullscreen: boolean;
  autoRefresh?: boolean;
  autoRefreshMs?: number;
}

function persistUI(s: {
  sidebarOpen: boolean;
  tocOpen: boolean;
  fullscreen: boolean;
  autoRefresh: boolean;
  autoRefreshMs: number;
}) {
  idbStorage
    .set(KEYS.ui, {
      sidebarOpen: s.sidebarOpen,
      tocOpen: s.tocOpen,
      fullscreen: s.fullscreen,
      autoRefresh: s.autoRefresh,
      autoRefreshMs: s.autoRefreshMs,
    })
    .catch(() => {});
}

export const useLibrary = create<LibraryState>((set, get) => ({
  files: {},
  folders: {},
  activeFileId: null,
  openTabs: [],
  recentIds: [],
  searchQuery: "",
  selectedTag: null,
  theme: DEFAULT_THEME,
  sidebarOpen: true,
  tocOpen: true,
  hydrated: false,
  sessionRev: 0,
  viewMode: "rendered",
  fullscreen: false,
  autoRefresh: false,
  autoRefreshMs: 2000,

  async hydrate() {
    const [files, folders, recent, theme, active, tabs, ui] = await Promise.all([
      idbStorage.get<Record<string, LibraryFile>>(KEYS.files),
      idbStorage.get<Record<string, LibraryFolder>>(KEYS.folders),
      idbStorage.get<string[]>(KEYS.recent),
      idbStorage.get<ThemeSettings>(KEYS.theme),
      idbStorage.get<string>(KEYS.active),
      idbStorage.get<string[]>(KEYS.tabs),
      idbStorage.get<UIPrefs>(KEYS.ui),
    ]);
    // Filter saved tabs to those whose file still exists.
    const allFiles = files ?? {};
    const savedTabs = (tabs ?? []).filter((id) => allFiles[id]);
    const savedActive =
      active && allFiles[active] ? active : savedTabs[0] ?? null;
    // If the active file isn't in the tab list, inject it so we never have
    // an "active file with no tab" discrepancy.
    const openTabs =
      savedActive && !savedTabs.includes(savedActive)
        ? [savedActive, ...savedTabs]
        : savedTabs;
    set({
      files: allFiles,
      folders: folders ?? {},
      recentIds: recent ?? [],
      theme: { ...DEFAULT_THEME, ...(theme ?? {}) },
      activeFileId: savedActive,
      openTabs,
      sidebarOpen: ui?.sidebarOpen ?? true,
      tocOpen: ui?.tocOpen ?? true,
      fullscreen: ui?.fullscreen ?? false,
      autoRefresh: ui?.autoRefresh ?? false,
      autoRefreshMs: ui?.autoRefreshMs ?? 2000,
      hydrated: true,
    });
  },

  async setActive(id) {
    const prev = get().activeFileId;
    set({ activeFileId: id });
    // Skip IDB write + downstream mutations when the id didn't change —
    // that avoids recreating the `files` map and re-firing every
    // file-subscribed selector for a no-op activation.
    if (id === prev) return;
    await idbStorage.set(KEYS.active, id);
    if (!id) return;
    const state = get();

    // Open-tabs list: if the file isn't already a tab, append it.
    // Clicking an existing tab or sidebar file that's already open does NOT
    // reorder tabs — tabs stay where the user put them.
    let openTabs = state.openTabs;
    if (!openTabs.includes(id)) {
      openTabs = [...openTabs, id];
      await idbStorage.set(KEYS.tabs, openTabs);
    }

    // Recent is a stable list — a file keeps its slot once added. Only brand
    // new files are prepended. Clicking around in Recent never reshuffles.
    let recent = state.recentIds;
    if (!recent.includes(id)) {
      recent = [id, ...recent].slice(0, 20);
      await idbStorage.set(KEYS.recent, recent);
    }

    const file = state.files[id];
    if (file) {
      const updated = {
        ...state.files,
        [id]: { ...file, lastOpenedAt: Date.now() },
      };
      set({ files: updated, recentIds: recent, openTabs });
      await idbStorage.set(KEYS.files, updated);
    } else {
      set({ recentIds: recent, openTabs });
    }
  },

  async closeTab(id) {
    const state = get();
    const idx = state.openTabs.indexOf(id);
    if (idx < 0) return;
    const nextTabs = state.openTabs.filter((x) => x !== id);
    let nextActive = state.activeFileId;
    if (state.activeFileId === id) {
      // Prefer the tab that was to the right, then to the left, then null.
      nextActive = nextTabs[idx] ?? nextTabs[idx - 1] ?? null;
    }
    set({ openTabs: nextTabs, activeFileId: nextActive });
    await idbStorage.set(KEYS.tabs, nextTabs);
    await idbStorage.set(KEYS.active, nextActive);
  },

  nextTab() {
    const s = get();
    if (!s.activeFileId || s.openTabs.length < 2) return;
    const i = s.openTabs.indexOf(s.activeFileId);
    const next = s.openTabs[(i + 1) % s.openTabs.length];
    get().setActive(next);
  },

  prevTab() {
    const s = get();
    if (!s.activeFileId || s.openTabs.length < 2) return;
    const i = s.openTabs.indexOf(s.activeFileId);
    const prev = s.openTabs[(i - 1 + s.openTabs.length) % s.openTabs.length];
    get().setActive(prev);
  },

  reorderTabs(fromId, toId) {
    const s = get();
    const from = s.openTabs.indexOf(fromId);
    const to = s.openTabs.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...s.openTabs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    set({ openTabs: next });
    idbStorage.set(KEYS.tabs, next).catch(() => {});
  },

  async addFiles(incoming) {
    const state = get();
    const next = { ...state.files };
    for (const f of incoming) next[f.id] = { ...next[f.id], ...f };
    set({ files: next });
    await idbStorage.set(KEYS.files, next);
  },

  async addFolder(folder, files) {
    const state = get();
    const nextFolders = {
      ...state.folders,
      [folder.id]: folder,
    };
    const nextFiles = { ...state.files };
    for (const f of files) nextFiles[f.id] = { ...nextFiles[f.id], ...f };
    set({ folders: nextFolders, files: nextFiles });

    // Persist without handle / fileHandles (non-serializable).
    const persisted: Record<string, LibraryFolder> = {};
    for (const [id, fo] of Object.entries(nextFolders)) {
      persisted[id] = {
        id: fo.id,
        name: fo.name,
        handleId: fo.handleId,
        addedAt: fo.addedAt,
        rootPath: fo.rootPath,
        kind: fo.kind,
      };
    }
    await idbStorage.set(KEYS.folders, persisted);
    await idbStorage.set(KEYS.files, nextFiles);
  },

  async rescanFolder(folderId) {
    // Dynamic import to avoid circular dep between store.ts and fs.ts.
    const { walkDirectory } = await import("./fs");
    const { sessionHandles } = await import("./sessionHandles");

    // fs.ts keeps fileExt() private; duplicate the two-liner here to
    // avoid exporting it purely for this one call site.
    const fileExt = (name: string): string => {
      const i = name.lastIndexOf(".");
      return i === -1 ? "" : name.slice(i + 1).toLowerCase();
    };

    const state = get();
    const folder = state.folders[folderId];
    if (!folder) return { added: 0, removed: 0 };

    const dir = sessionHandles.getDir(folderId);
    if (!dir) return { added: 0, removed: 0 };

    let entries: Awaited<ReturnType<typeof walkDirectory>>;
    try {
      entries = await walkDirectory(dir);
    } catch {
      return { added: 0, removed: 0 };
    }

    // Rebuild the on-disk file set keyed by the same id scheme
    // (`<folderId>:<relativePath>`) that pickFolder / folderFromHandle use.
    const currentState = get();
    const onDiskFiles: LibraryFile[] = [];
    const newFileHandles = new Map<string, FileSystemFileHandle>();
    for (const e of entries) {
      const fid = `${folderId}:${e.path}`;
      const name = e.path.split("/").pop() ?? e.path;
      const prev = currentState.files[fid];
      onDiskFiles.push({
        id: fid,
        name,
        ext: fileExt(name),
        path: e.path,
        folderId,
        // Preserve user-specific state (tags, starred, lastOpenedAt, size)
        // from any previously-known row; reset on genuinely-new files.
        size: prev?.size ?? 0,
        ...(prev?.starred !== undefined && { starred: prev.starred }),
        ...(prev?.tags && { tags: prev.tags }),
        ...(prev?.lastOpenedAt !== undefined && { lastOpenedAt: prev.lastOpenedAt }),
      });
      newFileHandles.set(fid, e.handle);
    }

    const onDiskIds = new Set(onDiskFiles.map((f) => f.id));
    const prevIdsForFolder = Object.values(currentState.files)
      .filter((f) => f.folderId === folderId)
      .map((f) => f.id);

    const addedCount = onDiskFiles.filter(
      (f) => !currentState.files[f.id],
    ).length;
    const removedIds = prevIdsForFolder.filter((id) => !onDiskIds.has(id));
    const removedCount = removedIds.length;
    if (addedCount === 0 && removedCount === 0) {
      // Idempotent no-op branch — CRITICAL for auto-refresh to feel
      // silent. Bumping `sessionRev` here would re-run every subscriber
      // (Viewer's load effect keyed on [file.id, sessionRev]) and cause
      // a visible loading flash on every poll tick, even when nothing
      // changed on disk.
      //
      // Old handles remain valid between walkDirectory calls (same
      // on-disk file → same semantic handle), so keeping the previously
      // registered fileHandles map is safe. If a file IS moved / renamed
      // / deleted, the diff above captures it and we hit the full
      // apply-changes path below.
      return { added: 0, removed: 0 };
    }

    // Apply add + remove atomically.
    const nextFiles = { ...currentState.files };
    for (const id of removedIds) delete nextFiles[id];
    for (const f of onDiskFiles) nextFiles[f.id] = f;

    // Close any tabs that pointed to removed files.
    const nextOpenTabs = currentState.openTabs.filter(
      (id) => !removedIds.includes(id),
    );
    const nextActive =
      currentState.activeFileId && removedIds.includes(currentState.activeFileId)
        ? (nextOpenTabs[0] ?? null)
        : currentState.activeFileId;
    const nextRecent = currentState.recentIds.filter(
      (id: string) => !removedIds.includes(id),
    );

    set({
      files: nextFiles,
      openTabs: nextOpenTabs,
      activeFileId: nextActive,
      recentIds: nextRecent,
    });
    await idbStorage.set(KEYS.recent, nextRecent);

    sessionHandles.register(folderId, dir, newFileHandles);
    useLibrary.setState((s) => ({ sessionRev: s.sessionRev + 1 }));

    await idbStorage.set(KEYS.files, nextFiles);

    return { added: addedCount, removed: removedCount };
  },

  async setFolderRootPath(folderId, rootPath) {
    const state = get();
    const folder = state.folders[folderId];
    if (!folder) return;
    const normalized = rootPath.trim().replace(/\/+$/, "");
    const next = {
      ...state.folders,
      [folderId]: { ...folder, rootPath: normalized || undefined },
    };
    set({ folders: next });

    const persisted: Record<string, LibraryFolder> = {};
    for (const [id, fo] of Object.entries(next)) {
      persisted[id] = {
        id: fo.id,
        name: fo.name,
        handleId: fo.handleId,
        addedAt: fo.addedAt,
        rootPath: fo.rootPath,
      };
    }
    await idbStorage.set(KEYS.folders, persisted);
  },

  async toggleStar(id) {
    const { files } = get();
    const f = files[id];
    if (!f) return;
    const updated = { ...files, [id]: { ...f, starred: !f.starred } };
    set({ files: updated });
    await idbStorage.set(KEYS.files, updated);
  },

  async setTags(id, tags) {
    const { files } = get();
    const f = files[id];
    if (!f) return;
    const updated = { ...files, [id]: { ...f, tags } };
    set({ files: updated });
    await idbStorage.set(KEYS.files, updated);
  },

  setSearchQuery(q) {
    set({ searchQuery: q });
  },

  setSelectedTag(tag) {
    set({ selectedTag: tag });
  },

  async setTheme(patch) {
    const next = { ...get().theme, ...patch };
    set({ theme: next });
    await idbStorage.set(KEYS.theme, next);
  },

  async resetTheme() {
    set({ theme: { ...DEFAULT_THEME } });
    await idbStorage.set(KEYS.theme, DEFAULT_THEME);
  },

  toggleSidebar() {
    set((s) => ({ sidebarOpen: !s.sidebarOpen }));
    persistUI(get());
  },

  toggleToc() {
    set((s) => ({ tocOpen: !s.tocOpen }));
    persistUI(get());
  },

  toggleFullscreen() {
    set((s) => ({ fullscreen: !s.fullscreen }));
    persistUI(get());
  },

  toggleAutoRefresh() {
    set((s) => ({ autoRefresh: !s.autoRefresh }));
    persistUI(get());
  },

  setAutoRefreshMs(ms) {
    set({ autoRefreshMs: Math.max(250, ms) });
    persistUI(get());
  },

  setViewMode(mode) {
    set({ viewMode: mode });
  },

  async removeFolder(folderId) {
    const state = get();
    const { [folderId]: _, ...folders } = state.folders;
    const deadIds = new Set(
      Object.values(state.files)
        .filter((f) => f.folderId === folderId)
        .map((f) => f.id)
    );
    const files = Object.fromEntries(
      Object.entries(state.files).filter(([id]) => !deadIds.has(id))
    );
    const openTabs = state.openTabs.filter((id) => !deadIds.has(id));
    const recentIds = state.recentIds.filter((id) => !deadIds.has(id));
    const activeFileId =
      state.activeFileId && deadIds.has(state.activeFileId)
        ? openTabs[0] ?? null
        : state.activeFileId;
    set({ folders, files, openTabs, recentIds, activeFileId });
    await idbStorage.set(KEYS.folders, folders);
    await idbStorage.set(KEYS.files, files);
    await idbStorage.set(KEYS.tabs, openTabs);
    await idbStorage.set(KEYS.recent, recentIds);
    await idbStorage.set(KEYS.active, activeFileId);
  },

  async removeFile(fileId) {
    const state = get();
    const { [fileId]: _, ...files } = state.files;
    const openTabs = state.openTabs.filter((x) => x !== fileId);
    const recentIds = state.recentIds.filter((x) => x !== fileId);
    const activeFileId =
      state.activeFileId === fileId ? openTabs[0] ?? null : state.activeFileId;
    set({ files, openTabs, recentIds, activeFileId });
    await idbStorage.set(KEYS.files, files);
    await idbStorage.set(KEYS.tabs, openTabs);
    await idbStorage.set(KEYS.recent, recentIds);
    await idbStorage.set(KEYS.active, activeFileId);
  },

  async clearAll() {
    set({
      files: {},
      folders: {},
      recentIds: [],
      openTabs: [],
      activeFileId: null,
    });
    await Promise.all([
      idbStorage.set(KEYS.files, {}),
      idbStorage.set(KEYS.folders, {}),
      idbStorage.set(KEYS.recent, []),
      idbStorage.set(KEYS.tabs, []),
      idbStorage.set(KEYS.active, null),
    ]);
  },

  async clearRecent() {
    set({ recentIds: [] });
    await idbStorage.set(KEYS.recent, []);
  },

  async clearDropped() {
    const state = get();
    const orphanIds = new Set(
      Object.values(state.files)
        .filter((f) => !f.folderId)
        .map((f) => f.id)
    );
    if (orphanIds.size === 0) return;
    const files = Object.fromEntries(
      Object.entries(state.files).filter(([id]) => !orphanIds.has(id))
    );
    const recentIds = state.recentIds.filter((id) => !orphanIds.has(id));
    const openTabs = state.openTabs.filter((id) => !orphanIds.has(id));
    const activeFileId = state.activeFileId && orphanIds.has(state.activeFileId)
      ? openTabs[0] ?? null
      : state.activeFileId;
    set({ files, recentIds, activeFileId, openTabs });
    await idbStorage.set(KEYS.files, files);
    await idbStorage.set(KEYS.recent, recentIds);
    await idbStorage.set(KEYS.tabs, openTabs);
    if (activeFileId !== state.activeFileId) {
      await idbStorage.set(KEYS.active, activeFileId);
    }
  },
}));
