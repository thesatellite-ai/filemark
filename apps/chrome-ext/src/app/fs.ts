import { SUPPORTED_EXTS } from "./registry";
import { idbStorage } from "./adapters/idbStorage";
import type { LibraryFile, LibraryFolder } from "./store";

const HANDLE_KEY = (id: string) => `fsa:handle:${id}`;
const LOOSE_KEY = (fileId: string) => `fsa:loose:${fileId}`;

function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function isRenderable(name: string): boolean {
  return SUPPORTED_EXTS.includes(fileExt(name));
}

export async function readFileAsText(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return await file.text();
}

export async function walkDirectory(
  dir: FileSystemDirectoryHandle,
  prefix = ""
): Promise<{ path: string; handle: FileSystemFileHandle }[]> {
  const out: { path: string; handle: FileSystemFileHandle }[] = [];
  // @ts-expect-error async iterator typing
  for await (const entry of dir.values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === "file") {
      if (isRenderable(entry.name)) out.push({ path, handle: entry });
    } else if (entry.kind === "directory") {
      // skip hidden + node_modules
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      out.push(...(await walkDirectory(entry, path)));
    }
  }
  return out;
}

export async function saveDirHandle(
  id: string,
  handle: FileSystemDirectoryHandle
): Promise<void> {
  await idbStorage.set(HANDLE_KEY(id), handle);
}

export async function loadDirHandle(
  id: string
): Promise<FileSystemDirectoryHandle | null> {
  return (await idbStorage.get<FileSystemDirectoryHandle>(HANDLE_KEY(id))) ?? null;
}

export async function saveLooseFileHandle(
  fileId: string,
  handle: FileSystemFileHandle
): Promise<void> {
  await idbStorage.set(LOOSE_KEY(fileId), handle);
}

export async function loadLooseFileHandle(
  fileId: string
): Promise<FileSystemFileHandle | null> {
  return (
    (await idbStorage.get<FileSystemFileHandle>(LOOSE_KEY(fileId))) ?? null
  );
}

export async function deleteLooseFileHandle(fileId: string): Promise<void> {
  await idbStorage.delete(LOOSE_KEY(fileId));
}

export async function queryPermissionState(
  handle: FileSystemHandle,
  mode: "read" | "readwrite" = "read"
): Promise<"granted" | "prompt" | "denied" | "unknown"> {
  // @ts-expect-error non-standard still
  const q = await handle.queryPermission?.({ mode });
  return (q as "granted" | "prompt" | "denied" | undefined) ?? "unknown";
}

export async function ensurePermission(
  handle: FileSystemHandle,
  mode: "read" | "readwrite" = "read"
): Promise<boolean> {
  const q = await queryPermissionState(handle, mode);
  if (q === "granted") return true;
  // @ts-expect-error non-standard still
  const r = await handle.requestPermission?.({ mode });
  return r === "granted";
}

/**
 * Try silently (no user gesture) to bring a saved folder back online. If the
 * underlying permission is already "granted" (Chrome's persisted-permission
 * behavior will often return this for handles stored in IndexedDB within the
 * same origin), we walk the directory and register live handles without any
 * user interaction. Returns null if a user gesture is required.
 */
export async function trySilentRestore(folder: LibraryFolder): Promise<{
  handle: FileSystemDirectoryHandle;
  fileHandles: Map<string, FileSystemFileHandle>;
} | null> {
  const handle = await loadDirHandle(folder.handleId);
  if (!handle) return null;
  const state = await queryPermissionState(handle, "read");
  if (state !== "granted") return null;
  const entries = await walkDirectory(handle);
  const fileHandles = new Map<string, FileSystemFileHandle>();
  for (const e of entries) {
    fileHandles.set(`${folder.id}:${e.path}`, e.handle);
  }
  return { handle, fileHandles };
}

/**
 * Build a full FSA-style `LibraryFolder` + `LibraryFile[]` + session
 * file-handle map from an already-obtained `FileSystemDirectoryHandle`.
 * The handle is persisted to IDB so it survives reloads. Used by both
 * `pickFolder()` (via the user's Open Folder button) and by the
 * drop-zone, when a dragged folder exposes `getAsFileSystemHandle()`.
 */
export async function folderFromHandle(
  handle: FileSystemDirectoryHandle,
): Promise<{
  folder: LibraryFolder;
  files: LibraryFile[];
  fileHandles: Map<string, FileSystemFileHandle>;
}> {
  const id = crypto.randomUUID();
  await saveDirHandle(id, handle);

  const entries = await walkDirectory(handle);
  const files: LibraryFile[] = [];
  const fileHandles = new Map<string, FileSystemFileHandle>();
  for (const e of entries) {
    const fid = `${id}:${e.path}`;
    const name = e.path.split("/").pop() ?? e.path;
    files.push({
      id: fid,
      name,
      ext: fileExt(name),
      path: e.path,
      folderId: id,
      size: 0,
    });
    fileHandles.set(fid, e.handle);
  }

  const folder: LibraryFolder = {
    id,
    name: handle.name,
    handle,
    fileHandles,
    handleId: id,
    addedAt: Date.now(),
    kind: "fsa",
  };
  return { folder, files, fileHandles };
}

export async function pickFolder(): Promise<{
  folder: LibraryFolder;
  files: LibraryFile[];
  fileHandles: Map<string, FileSystemFileHandle>;
} | null> {
  // @ts-expect-error showDirectoryPicker typed in recent TS libs
  const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
    mode: "read",
  });
  return folderFromHandle(handle);
}

export async function restoreFolder(folder: LibraryFolder): Promise<{
  handle: FileSystemDirectoryHandle;
  fileHandles: Map<string, FileSystemFileHandle>;
} | null> {
  const handle = await loadDirHandle(folder.handleId);
  if (!handle) return null;
  const granted = await ensurePermission(handle, "read");
  if (!granted) return null;
  const entries = await walkDirectory(handle);
  const fileHandles = new Map<string, FileSystemFileHandle>();
  for (const e of entries) {
    const fid = `${folder.id}:${e.path}`;
    fileHandles.set(fid, e.handle);
  }
  return { handle, fileHandles };
}

export async function readDroppedFile(
  file: File,
  sourceUrl?: string,
  handle?: FileSystemFileHandle | null
): Promise<LibraryFile & { content: string }> {
  const content = await file.text();
  const id = sourceUrl ? `intercept:${sourceUrl}` : `drop:${crypto.randomUUID()}`;
  // If the drop event resolved a FileSystemFileHandle for this loose file,
  // persist it to IDB so the Viewer can re-read live bytes after a page
  // reload (silently if Chrome still considers the permission granted).
  if (handle) {
    try {
      await saveLooseFileHandle(id, handle);
    } catch {
      /* persistence is best-effort; cached content keeps the file viewable */
    }
  }
  return {
    id,
    name: file.name,
    ext: fileExt(file.name),
    path: sourceUrl ? decodeURIComponent(new URL(sourceUrl).pathname.split("/").pop() ?? file.name) : file.name,
    folderId: null,
    size: file.size,
    content,
    sourceUrl,
  };
}
