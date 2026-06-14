import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, extname } from "node:path";

// Extensions filemark can render (matches the chrome-ext registry surface).
export const SUPPORTED = new Set([
  "md",
  "mdx",
  "markdown",
  "json",
  "jsonc",
  "csv",
  "tsv",
  "sql",
  "prisma",
  "dbml",
]);

// Blacklist noise dirs by name (NOT all dot-prefixed — same rule as the
// chrome-ext folder walker; .github etc. are legitimate doc homes).
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  ".turbo",
  ".cache",
  "coverage",
  ".pnpm",
]);

export interface WalkedFile {
  relPath: string;
  ext: string;
}

export async function walkProject(root: string): Promise<WalkedFile[]> {
  const found: WalkedFile[] = [];
  async function recurse(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // unreadable dir — skip, don't crash the whole walk
    }
    for (const e of entries) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        await recurse(abs);
      } else if (e.isFile()) {
        const ext = extname(e.name).slice(1).toLowerCase();
        if (SUPPORTED.has(ext)) {
          found.push({ relPath: relative(root, abs), ext });
        }
      }
    }
  }
  await recurse(root);
  found.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return found;
}

export async function readProjectFile(absPath: string): Promise<string> {
  return readFile(absPath, "utf8");
}

export async function isDirectory(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}
