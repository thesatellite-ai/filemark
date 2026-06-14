import { join, isAbsolute, dirname } from "node:path";
import { writeFile, rename, mkdir, stat } from "node:fs/promises";
import { ipcMain, dialog, shell } from "electron";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { kv } from "./db/schema";
import { addProject, listProjects } from "./projects";
import { readProjectFile, isDirectory } from "./fs";
import { watchProject } from "./watch";

// The ONLY privileged surface exposed to the renderer (DESKTOP_PLAN.md
// ADR-DESK-1). Three channels = the StorageAdapter contract. Values are
// JSON strings; null is "absent" so the adapter can return null cleanly.
export function registerIpc(): void {
  ipcMain.handle("storage:get", async (_e, key: string): Promise<unknown> => {
    const row = await getDb()
      .select({ value: kv.value })
      .from(kv)
      .where(eq(kv.key, key))
      .limit(1);
    return row[0] ? JSON.parse(row[0].value) : null;
  });

  ipcMain.handle(
    "storage:set",
    async (_e, key: string, value: unknown): Promise<void> => {
      const json = JSON.stringify(value);
      await getDb()
        .insert(kv)
        .values({ key, value: json })
        .onConflictDoUpdate({ target: kv.key, set: { value: json } });
    },
  );

  ipcMain.handle("storage:delete", async (_e, key: string): Promise<void> => {
    await getDb().delete(kv).where(eq(kv.key, key));
  });

  // --- Projects ---------------------------------------------------------

  // Native folder picker → add as project + start watching.
  ipcMain.handle("project:open", async (e) => {
    const r = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (r.canceled || !r.filePaths[0]) return null;
    const p = await addProject(r.filePaths[0]);
    watchProject(p.rootPath, e.sender);
    return p;
  });

  // Add by absolute path (drag-dropped folder; path resolved in preload
  // via webUtils). Rejected if not a real directory.
  ipcMain.handle("project:add", async (e, rootPath: string) => {
    if (!isAbsolute(rootPath) || !(await isDirectory(rootPath))) return null;
    const p = await addProject(rootPath);
    watchProject(p.rootPath, e.sender);
    return p;
  });

  ipcMain.handle("project:list", async (e) => {
    const ps = await listProjects();
    for (const p of ps) watchProject(p.rootPath, e.sender);
    return ps;
  });

  // Read a file by project root + relative path. Path-traversal guarded:
  // the resolved path must stay inside the project root.
  ipcMain.handle(
    "file:read",
    async (_e, rootPath: string, relPath: string): Promise<string | null> => {
      const abs = join(rootPath, relPath);
      if (!abs.startsWith(rootPath)) return null;
      try {
        return await readProjectFile(abs);
      } catch {
        return null;
      }
    },
  );

  // All write ops are confined to a project root (path-traversal guard).
  const within = (root: string, rel: string): string | null => {
    const abs = join(root, rel);
    return abs.startsWith(root) ? abs : null;
  };

  // file:write returns the new mtimeMs so the renderer can detect an
  // external change before clobbering on the next save (conflict guard).
  ipcMain.handle(
    "file:write",
    async (_e, root: string, rel: string, text: string): Promise<number | null> => {
      const abs = within(root, rel);
      if (!abs) return null;
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, text, "utf8");
      return (await stat(abs)).mtimeMs;
    },
  );

  ipcMain.handle("file:mtime", async (_e, root: string, rel: string) => {
    const abs = within(root, rel);
    if (!abs) return null;
    try {
      return (await stat(abs)).mtimeMs;
    } catch {
      return null;
    }
  });

  ipcMain.handle(
    "file:rename",
    async (_e, root: string, from: string, to: string): Promise<boolean> => {
      const a = within(root, from);
      const b = within(root, to);
      if (!a || !b) return false;
      await mkdir(dirname(b), { recursive: true });
      await rename(a, b);
      return true;
    },
  );

  ipcMain.handle(
    "file:new",
    async (_e, root: string, rel: string): Promise<boolean> => {
      const abs = within(root, rel);
      if (!abs) return false;
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, "", { flag: "wx" }).catch(() => undefined);
      return true;
    },
  );

  // Delete = move to OS trash, never hard unlink (DESKTOP_PLAN.md P5).
  ipcMain.handle(
    "file:trash",
    async (_e, root: string, rel: string): Promise<boolean> => {
      const abs = within(root, rel);
      if (!abs) return false;
      await shell.trashItem(abs);
      return true;
    },
  );

  // --- OS integration (real absolute paths — the Chrome ext couldn't) ---
  ipcMain.handle("os:openPath", (_e, root: string, rel: string) =>
    shell.openPath(join(root, rel)),
  );
  ipcMain.handle("os:reveal", (_e, root: string, rel: string) => {
    shell.showItemInFolder(join(root, rel));
  });
}
