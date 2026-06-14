import { create } from "zustand";
import { sqlStorage } from "./adapters/sqlStorage";
import type { ProjectDTO } from "../../preload";

export interface FileEntry {
  id: string;
  projectId: string;
  rootPath: string;
  relPath: string;
  ext: string;
}

// Keys match the chrome-ext store + the libsql kv migration, so the
// persistence model is byte-identical across hosts.
const K = { tabs: "lib:tabs", active: "lib:active", recent: "lib:recent" };
const RECENT_MAX = 20;

interface State {
  projects: ProjectDTO[];
  files: Record<string, FileEntry>;
  openTabs: string[];
  activeId: string | null;
  recents: string[];
  hydrate: () => Promise<void>;
  setProjects: (ps: ProjectDTO[]) => void;
  open: (id: string) => void;
  setActive: (id: string) => void;
  closeTab: (id: string) => void;
  reorderTabs: (from: number, to: number) => void;
}

function indexFiles(ps: ProjectDTO[]): Record<string, FileEntry> {
  const out: Record<string, FileEntry> = {};
  for (const p of ps)
    for (const f of p.files)
      out[f.id] = {
        id: f.id,
        projectId: p.id,
        rootPath: p.rootPath,
        relPath: f.relPath,
        ext: f.ext,
      };
  return out;
}

export const useStore = create<State>((set, get) => ({
  projects: [],
  files: {},
  openTabs: [],
  activeId: null,
  recents: [],

  async hydrate() {
    const ps = await window.filemark.projects.list();
    const files = indexFiles(ps);
    const exists = (id: string): boolean => id in files;
    const [tabs, active, recent] = await Promise.all([
      sqlStorage.get<string[]>(K.tabs),
      sqlStorage.get<string>(K.active),
      sqlStorage.get<string[]>(K.recent),
    ]);
    // Prune persisted ids whose files no longer exist on disk.
    const openTabs = (tabs ?? []).filter(exists);
    const recents = (recent ?? []).filter(exists);
    let activeId = active && exists(active) ? active : openTabs[0] ?? null;
    if (activeId && !openTabs.includes(activeId)) openTabs.push(activeId);
    set({ projects: ps, files, openTabs, activeId, recents });
  },

  setProjects(ps) {
    set({ projects: ps, files: indexFiles(ps) });
  },

  open(id) {
    const s = get();
    if (!(id in s.files)) return;
    // Recents stable-slot invariant (chrome-ext rule): a file keeps its
    // slot once added; opening an existing recent does NOT reshuffle.
    let recents = s.recents;
    if (!recents.includes(id)) {
      recents = [id, ...recents].slice(0, RECENT_MAX);
      void sqlStorage.set(K.recent, recents);
    }
    const openTabs = s.openTabs.includes(id)
      ? s.openTabs
      : [...s.openTabs, id];
    if (openTabs !== s.openTabs) void sqlStorage.set(K.tabs, openTabs);
    void sqlStorage.set(K.active, id);
    set({ recents, openTabs, activeId: id });
  },

  setActive(id) {
    void sqlStorage.set(K.active, id);
    set({ activeId: id });
  },

  closeTab(id) {
    const s = get();
    const idx = s.openTabs.indexOf(id);
    if (idx < 0) return;
    const openTabs = s.openTabs.filter((t) => t !== id);
    let activeId = s.activeId;
    if (activeId === id) {
      // Next preference: right → left → null (chrome-ext behavior).
      activeId = openTabs[idx] ?? openTabs[idx - 1] ?? null;
      void sqlStorage.set(K.active, activeId ?? "");
    }
    void sqlStorage.set(K.tabs, openTabs);
    set({ openTabs, activeId });
  },

  reorderTabs(from, to) {
    const s = get();
    if (from === to) return;
    const openTabs = [...s.openTabs];
    const [moved] = openTabs.splice(from, 1);
    openTabs.splice(to, 0, moved);
    void sqlStorage.set(K.tabs, openTabs);
    set({ openTabs });
  },
}));
