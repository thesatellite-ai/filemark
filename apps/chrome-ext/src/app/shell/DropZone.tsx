import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { useLibrary, type LibraryFile, type LibraryFolder } from "../store";
import { useSettings, isFormatEnabled } from "../settings";
import { folderFromHandle, readDroppedFile } from "../fs";
import { sessionHandles } from "../sessionHandles";
import { isSupported, SUPPORTED_EXTS } from "../registry";

export function DropZone() {
  const [dragging, setDragging] = useState(false);
  const addFiles = useLibrary((s) => s.addFiles);
  const addFolder = useLibrary((s) => s.addFolder);
  const setActive = useLibrary((s) => s.setActive);
  const settings = useSettings((s) => s.settings);

  const acceptExt = (ext: string) =>
    isSupported(ext) && isFormatEnabled(settings, ext);

  useEffect(() => {
    let depth = 0;
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      depth++;
      setDragging(true);
    };
    const onDragLeave = () => {
      depth--;
      if (depth <= 0) {
        depth = 0;
        setDragging(false);
      }
    };
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };

    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setDragging(false);
      if (!e.dataTransfer) return;

      const uriList = readUriList(e.dataTransfer);

      // The DataTransfer object is **only valid during the synchronous**
      // part of the drop event handler. `await` resolves on a later
      // microtask — by then `e.dataTransfer.files` / `.items` are stale
      // (Chrome empties them after the handler returns). So we must:
      //   1. Snapshot `looseFiles` + `items` synchronously.
      //   2. START the async `getAsFileSystemHandle()` promises + call
      //      `webkitGetAsEntry()` synchronously — each method has to be
      //      called inside the event window, but the returned Promise
      //      can be awaited later.
      //   3. Await resolutions in the next phase, off the now-stale event.
      //
      // Previous bug: snapshot happened AFTER the await loop, so
      // dragging a single file gave us an empty `looseFiles` array — no
      // file added, silent failure.
      const items = Array.from(e.dataTransfer.items);
      const looseFiles = Array.from(e.dataTransfer.files);
      const webkitEntries: Array<FileSystemEntry | null> = items.map((it) =>
        it.kind === "file" ? (it.webkitGetAsEntry?.() ?? null) : null,
      );
      const handlePromises: Array<Promise<FileSystemHandle | null>> = items.map(
        (it) => {
          if (it.kind !== "file") return Promise.resolve(null);
          try {
            const fn = (
              it as DataTransferItem & {
                getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
              }
            ).getAsFileSystemHandle;
            return fn ? fn.call(it) : Promise.resolve(null);
          } catch {
            return Promise.resolve(null);
          }
        },
      );

      // --- now safe to await; DataTransfer is stale but we have snapshots.
      const resolvedHandles = await Promise.all(
        handlePromises.map((p) => p.catch(() => null)),
      );

      const dirEntries: FileSystemDirectoryEntry[] = [];
      const dirHandles: FileSystemDirectoryHandle[] = [];
      for (let i = 0; i < items.length; i++) {
        const handle = resolvedHandles[i];
        if (handle && handle.kind === "directory") {
          dirHandles.push(handle as FileSystemDirectoryHandle);
          continue;
        }
        const entry = webkitEntries[i];
        if (entry?.isDirectory) {
          dirEntries.push(entry as FileSystemDirectoryEntry);
        }
      }

      if (
        dirEntries.length === 0 &&
        dirHandles.length === 0 &&
        looseFiles.length === 0
      )
        return;

      let firstActiveId: string | null = null;

      // --- Directory drops (FSA handle, persistent) ---------------------
      for (const dirHandle of dirHandles) {
        try {
          const res = await folderFromHandle(dirHandle);
          sessionHandles.register(
            res.folder.id,
            res.folder.handle!,
            res.fileHandles,
          );
          const supported = res.files.filter((f) => acceptExt(f.ext));
          if (supported.length === 0) continue;
          await addFolder(res.folder, supported);
          if (!firstActiveId) firstActiveId = supported[0]!.id;
          useLibrary.setState((s) => ({ sessionRev: s.sessionRev + 1 }));
        } catch (err) {
          console.warn("DropZone: failed to register FSA handle", err);
        }
      }

      // --- Directory drops ------------------------------------------------
      // Walk each dropped dir, read every supported file's content into
      // memory, and register as a library folder. If text/uri-list supplied
      // a file:// URL for this dir, its absolute path auto-fills rootPath —
      // so Open in editor / Reveal in Finder light up with zero user config.
      for (const dir of dirEntries) {
        const walked = await walkDirEntry(dir, acceptExt);
        if (walked.length === 0) continue;

        const folderId = crypto.randomUUID();
        const rootPath = uriPathFor(uriList, dir.name);

        const folder: LibraryFolder = {
          id: folderId,
          name: dir.name,
          handleId: folderId,
          addedAt: Date.now(),
          rootPath,
          kind: "drop",
        };

        const folderFiles: LibraryFile[] = [];
        for (const { file, relPath } of walked) {
          const content = await file.text();
          folderFiles.push({
            id: `drop-dir:${folderId}:${relPath}`,
            name: file.name,
            ext: extOf(file.name),
            path: relPath,
            folderId,
            size: file.size,
            content,
          });
        }

        await addFolder(folder, folderFiles);
        if (!firstActiveId) firstActiveId = folderFiles[0].id;
      }

      // --- Loose file drops ----------------------------------------------
      if (looseFiles.length > 0) {
        const supported = looseFiles.filter((f) => acceptExt(extOf(f.name)));
        const parsed = await Promise.all(
          supported.map((file) =>
            readDroppedFile(file, uriMatch(uriList, file.name))
          )
        );
        if (parsed.length > 0) {
          await addFiles(parsed);
          if (!firstActiveId) firstActiveId = parsed[0].id;
        }
      }

      if (firstActiveId) await setActive(firstActiveId);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [addFiles, addFolder, setActive]);

  if (!dragging) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[1000] grid place-items-center bg-black/40 backdrop-blur-sm">
      <div className="bg-popover text-popover-foreground border-primary/60 flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-10 py-8 shadow-xl">
        <Upload className="text-primary size-8" />
        <div className="text-lg font-semibold">Drop to open</div>
        <div className="text-muted-foreground text-xs">
          Files or folders · {SUPPORTED_EXTS.join(" · ")}
        </div>
      </div>
    </div>
  );
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1) : "";
}

// ── FileSystemEntry helpers ─────────────────────────────────────────────────

function fileFromEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function readAllEntries(
  reader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> {
  const out: FileSystemEntry[] = [];
  while (true) {
    const batch: FileSystemEntry[] = await new Promise((resolve, reject) =>
      reader.readEntries(resolve, reject)
    );
    if (batch.length === 0) break;
    out.push(...batch);
  }
  return out;
}

/**
 * Recursively walk a dropped directory. Returns a flat list of supported
 * files, each with a forward-slash relative path from the drop root (the
 * directory name itself is NOT included — e.g. if `codeskill/` is dropped
 * and it contains `research/foo.md`, the relPath is `research/foo.md`).
 * Skips hidden dirs and `node_modules`.
 */
async function walkDirEntry(
  dir: FileSystemDirectoryEntry,
  accept: (ext: string) => boolean
): Promise<{ file: File; relPath: string }[]> {
  const results: { file: File; relPath: string }[] = [];

  const walk = async (entry: FileSystemEntry, currentPath: string) => {
    if (entry.isFile) {
      if (!accept(extOf(entry.name))) return;
      const file = await fileFromEntry(entry as FileSystemFileEntry);
      results.push({ file, relPath: currentPath });
      return;
    }
    if (entry.isDirectory) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") return;
      const sub = await readAllEntries(
        (entry as FileSystemDirectoryEntry).createReader()
      );
      await Promise.all(
        sub.map((c) =>
          walk(c, currentPath ? `${currentPath}/${c.name}` : c.name)
        )
      );
    }
  };

  const children = await readAllEntries(dir.createReader());
  await Promise.all(children.map((c) => walk(c, c.name)));
  return results;
}

// ── text/uri-list helpers ────────────────────────────────────────────────────

function readUriList(dt: DataTransfer | null): string[] {
  if (!dt) return [];
  const raw = dt.getData("text/uri-list") || dt.getData("text/plain");
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("file://"));
}

function uriMatch(uris: string[], filename: string): string | undefined {
  return uris.find((u) => {
    try {
      return decodeURIComponent(new URL(u).pathname.split("/").pop() ?? "") === filename;
    } catch {
      return false;
    }
  });
}

/**
 * Absolute path of a dropped directory, derived from its `file://` URL in
 * text/uri-list. Matches by trailing segment equal to the directory name.
 */
function uriPathFor(uris: string[], dirName: string): string | undefined {
  const hit = uris.find((u) => {
    try {
      const p = decodeURIComponent(new URL(u).pathname).replace(/\/+$/, "");
      return p.endsWith(`/${dirName}`);
    } catch {
      return false;
    }
  });
  if (!hit) return undefined;
  try {
    return decodeURIComponent(new URL(hit).pathname).replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}
