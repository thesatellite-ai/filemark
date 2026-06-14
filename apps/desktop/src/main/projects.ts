import { createHash } from "node:crypto";
import { basename } from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { files as filesT, projects as projectsT } from "./db/schema";
import { walkProject } from "./fs";

// Deterministic id from the absolute path: re-adding the same folder
// UPDATES its file list instead of creating a duplicate project (mirrors
// the chrome-ext "a folder keeps its identity" expectation).
const projectId = (root: string): string =>
  "prj_" + createHash("sha1").update(root).digest("hex").slice(0, 16);
const fileId = (pid: string, rel: string): string => `${pid}:${rel}`;

export interface ProjectDTO {
  id: string;
  name: string;
  rootPath: string;
  files: { id: string; relPath: string; ext: string }[];
}

export async function addProject(rootPath: string): Promise<ProjectDTO> {
  const db = getDb();
  const id = projectId(rootPath);
  const name = basename(rootPath) || rootPath;
  const now = Math.floor(Date.now() / 1000);

  await db
    .insert(projectsT)
    .values({ id, name, rootPath, lastOpenedAt: now })
    .onConflictDoUpdate({
      target: projectsT.id,
      set: { name, rootPath, lastOpenedAt: now },
    });

  const walked = await walkProject(rootPath);
  // Re-sync the file set: clear then re-insert (project is small; folders
  // are walked fresh on every add — chokidar keeps it live afterwards).
  await db.delete(filesT).where(eq(filesT.projectId, id));
  if (walked.length) {
    await db.insert(filesT).values(
      walked.map((w) => ({
        id: fileId(id, w.relPath),
        projectId: id,
        relPath: w.relPath,
        ext: w.ext,
      })),
    );
  }

  return {
    id,
    name,
    rootPath,
    files: walked.map((w) => ({
      id: fileId(id, w.relPath),
      relPath: w.relPath,
      ext: w.ext,
    })),
  };
}

export async function listProjects(): Promise<ProjectDTO[]> {
  const db = getDb();
  const ps = await db.select().from(projectsT);
  const out: ProjectDTO[] = [];
  for (const p of ps) {
    const fs = await db
      .select()
      .from(filesT)
      .where(eq(filesT.projectId, p.id));
    out.push({
      id: p.id,
      name: p.name,
      rootPath: p.rootPath,
      files: fs.map((f) => ({ id: f.id, relPath: f.relPath, ext: f.ext })),
    });
  }
  return out;
}
