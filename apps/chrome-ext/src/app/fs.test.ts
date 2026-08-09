import { describe, it, expect } from "vitest";
import { buildFolderHandleMap } from "./fs";

// ---------------------------------------------------------------------------
// Minimal fakes for the File System Access handles walkDirectory() consumes.
// walkDirectory only ever reads `.kind`, `.name`, and async-iterates
// `.values()` — it never calls getFile() during a walk — so these stubs are
// sufficient and keep the test in the fast `node` environment (no jsdom).
// ---------------------------------------------------------------------------

type FakeEntry =
  | { kind: "file"; name: string }
  | { kind: "directory"; name: string; entries: FakeEntry[] };

/** A NotFoundError shaped exactly like the DOMException Chrome throws when a
 *  restored handle points at a folder that has been deleted/moved on disk. */
function notFound(): Error {
  return Object.assign(
    new Error("A requested file or directory could not be found."),
    { name: "NotFoundError" },
  );
}

/** Build a fake directory handle named `name`. When `throwOnValues` is set,
 *  iterating `.values()` rejects — simulating an unreachable (moved/deleted)
 *  folder. `name` matters: walkDirectory derives paths and noise-dir pruning
 *  from each yielded handle's `.name`. */
function fakeDir(
  name: string,
  entries: FakeEntry[],
  opts: { throwOnValues?: boolean } = {},
): FileSystemDirectoryHandle {
  const handle = {
    kind: "directory" as const,
    name,
    async *values() {
      if (opts.throwOnValues) throw notFound();
      for (const e of entries) {
        yield e.kind === "file"
          ? { kind: "file" as const, name: e.name }
          : fakeDir(e.name, e.entries);
      }
    },
  };
  return handle as unknown as FileSystemDirectoryHandle;
}

const FOLDER_ID = "F";

describe("buildFolderHandleMap", () => {
  it("keys each renderable file as `${folderId}:${relPath}`", async () => {
    const map = await buildFolderHandleMap(
      FOLDER_ID,
      fakeDir("root", [
        { kind: "file", name: "readme.md" },
        { kind: "file", name: "notes.md" },
      ]),
    );
    expect(map).not.toBeNull();
    expect([...map!.keys()].sort()).toEqual(["F:notes.md", "F:readme.md"]);
  });

  it("descends into subfolders and skips noise dirs (.git, node_modules)", async () => {
    const map = await buildFolderHandleMap(
      FOLDER_ID,
      fakeDir("root", [
        { kind: "file", name: "a.md" },
        { kind: "directory", name: "sub", entries: [{ kind: "file", name: "b.md" }] },
        // Noise dirs must be pruned entirely — their contents never registered.
        { kind: "directory", name: ".git", entries: [{ kind: "file", name: "c.md" }] },
        { kind: "directory", name: "node_modules", entries: [{ kind: "file", name: "d.md" }] },
      ]),
    );
    expect(map).not.toBeNull();
    expect([...map!.keys()].sort()).toEqual(["F:a.md", "F:sub/b.md"]);
  });

  it("returns null (never throws) when the folder is gone on disk — the boot-crash fix", async () => {
    // This is the exact failure that used to escape as an uncaught promise
    // rejection during boot and render a NotFoundError overlay on open.
    await expect(
      buildFolderHandleMap(FOLDER_ID, fakeDir("root", [], { throwOnValues: true })),
    ).resolves.toBeNull();
  });

  it("returns an empty map for an empty (but reachable) folder", async () => {
    const map = await buildFolderHandleMap(FOLDER_ID, fakeDir("root", []));
    expect(map).not.toBeNull();
    expect(map!.size).toBe(0);
  });
});
