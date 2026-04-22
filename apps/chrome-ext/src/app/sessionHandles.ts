/**
 * FileSystemHandles are not serializable across page reloads in a meaningful
 * way: they can live in IndexedDB but permission must be re-granted each
 * session. This module holds the live handles for the current tab session.
 */

interface Entry {
  dir: FileSystemDirectoryHandle;
  files: Map<string, FileSystemFileHandle>;
}

class SessionHandles {
  private map = new Map<string, Entry>();

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
}

export const sessionHandles = new SessionHandles();
