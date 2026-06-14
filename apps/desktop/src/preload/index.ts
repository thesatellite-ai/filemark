import { contextBridge, ipcRenderer, webUtils } from "electron";

export interface ProjectDTO {
  id: string;
  name: string;
  rootPath: string;
  files: { id: string; relPath: string; ext: string }[];
}

// Narrow, typed bridge — the ONLY privileged surface (ADR-DESK-1).
// Nothing from node/electron leaks beyond these whitelisted calls.
const api = {
  version: process.versions.electron,
  platform: process.platform,
  storage: {
    get: (k: string): Promise<unknown> => ipcRenderer.invoke("storage:get", k),
    set: (k: string, v: unknown): Promise<void> =>
      ipcRenderer.invoke("storage:set", k, v),
    delete: (k: string): Promise<void> =>
      ipcRenderer.invoke("storage:delete", k),
  },
  projects: {
    open: (): Promise<ProjectDTO | null> => ipcRenderer.invoke("project:open"),
    add: (rootPath: string): Promise<ProjectDTO | null> =>
      ipcRenderer.invoke("project:add", rootPath),
    list: (): Promise<ProjectDTO[]> => ipcRenderer.invoke("project:list"),
  },
  files: {
    read: (rootPath: string, relPath: string): Promise<string | null> =>
      ipcRenderer.invoke("file:read", rootPath, relPath),
    write: (root: string, rel: string, text: string): Promise<number | null> =>
      ipcRenderer.invoke("file:write", root, rel, text),
    mtime: (root: string, rel: string): Promise<number | null> =>
      ipcRenderer.invoke("file:mtime", root, rel),
    rename: (root: string, from: string, to: string): Promise<boolean> =>
      ipcRenderer.invoke("file:rename", root, from, to),
    create: (root: string, rel: string): Promise<boolean> =>
      ipcRenderer.invoke("file:new", root, rel),
    trash: (root: string, rel: string): Promise<boolean> =>
      ipcRenderer.invoke("file:trash", root, rel),
  },
  os: {
    openPath: (root: string, rel: string): Promise<string> =>
      ipcRenderer.invoke("os:openPath", root, rel),
    reveal: (root: string, rel: string): Promise<void> =>
      ipcRenderer.invoke("os:reveal", root, rel),
  },
  // webUtils.getPathForFile is the supported way to get a dropped
  // folder's absolute path under contextIsolation (no nodeIntegration).
  pathForFile: (f: File): string => webUtils.getPathForFile(f),
  onFilesChanged: (cb: (paths: string[]) => void): (() => void) => {
    const h = (_e: unknown, paths: string[]): void => cb(paths);
    ipcRenderer.on("project:files-changed", h);
    return () => ipcRenderer.off("project:files-changed", h);
  },
} as const;

export type FilemarkBridge = typeof api;

contextBridge.exposeInMainWorld("filemark", api);
