/**
 * FileSystemHandles are not serializable across page reloads in a meaningful
 * way: they can live in IndexedDB but permission must be re-granted each
 * session. This module holds the live handles for the current tab session.
 *
 * Two flavors:
 *   - Folder handles + their walked file handles, registered as an Entry
 *     (`register` / `getFile` / `getDir`). Used by FSA folder drops + the
 *     "Open folder" picker.
 *   - Loose single-file handles, registered by file id. Used by single-file
 *     drag-drops where the user drops one .md / .csv / etc. (no folder
 *     context). Lets the Viewer re-read the file from disk on focus / poll
 *     instead of forever showing the frozen cached drop-time bytes.
 */

interface Entry {
  dir: FileSystemDirectoryHandle;
  files: Map<string, FileSystemFileHandle>;
}

class SessionHandles {
  private map = new Map<string, Entry>();
  private loose = new Map<string, FileSystemFileHandle>();

  register(
    folderId: string,
    dir: FileSystemDirectoryHandle,
    files: Map<string, FileSystemFileHandle>
  ) {
    this.map.set(folderId, { dir, files });
  }

  has(folderId: string): boolean {
    return this.map.has(folderId);
  }

  getFile(folderId: string, fileId: string): FileSystemFileHandle | null {
    return this.map.get(folderId)?.files.get(fileId) ?? null;
  }

  getDir(folderId: string): FileSystemDirectoryHandle | null {
    return this.map.get(folderId)?.dir ?? null;
  }

  unregister(folderId: string) {
    this.map.delete(folderId);
  }

  registerLoose(fileId: string, handle: FileSystemFileHandle) {
    this.loose.set(fileId, handle);
  }

  getLoose(fileId: string): FileSystemFileHandle | null {
    return this.loose.get(fileId) ?? null;
  }

  unregisterLoose(fileId: string) {
    this.loose.delete(fileId);
  }
}

export const sessionHandles = new SessionHandles();
