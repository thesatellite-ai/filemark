import { describe, it, expect, beforeEach } from "vitest";
import { createRevisionStore, normalizeDocKey } from "./store";
import { MAX_REVISIONS } from "./constants";
import type { RevisionStorageAdapter, RevisionStore } from "./types";

// A trivial in-memory adapter — this is exactly the seam that makes the store
// portable: no chrome, no globals, just the RevisionStorageAdapter contract.
function createMemoryAdapter(): RevisionStorageAdapter {
  const data = new Map<string, unknown>();
  return {
    get: async (key) => data.get(key),
    set: async (key, value) => {
      data.set(key, value);
    },
    remove: async (key) => {
      data.delete(key);
    },
  };
}

let store: RevisionStore;
beforeEach(() => {
  store = createRevisionStore(createMemoryAdapter());
});

describe("normalizeDocKey", () => {
  it("strips the #fragment from http(s) URLs (an anchor is the same doc)", () => {
    expect(normalizeDocKey("https://x.com/a.md#section")).toBe("https://x.com/a.md");
  });
  it("leaves file:// paths and ids untouched (trimmed)", () => {
    expect(normalizeDocKey("  file:///a/b.md  ")).toBe("file:///a/b.md");
    expect(normalizeDocKey("lib-id-123")).toBe("lib-id-123");
  });
  it("returns '' for empty input", () => {
    expect(normalizeDocKey("")).toBe("");
    expect(normalizeDocKey(null)).toBe("");
  });
});

describe("tracked set", () => {
  it("tracks, reports, and untracks a doc", async () => {
    const k = "doc-1";
    expect(await store.isTracked(k)).toBe(false);
    await store.track(k);
    expect(await store.isTracked(k)).toBe(true);
    expect(await store.listTracked()).toContain(k);
    await store.untrack(k);
    expect(await store.isTracked(k)).toBe(false);
  });

  it("track is idempotent (no duplicates)", async () => {
    await store.track("d");
    await store.track("d");
    expect((await store.listTracked()).filter((x) => x === "d")).toHaveLength(1);
  });
});

describe("appendRevision", () => {
  it("dedups identical content (no new revision)", async () => {
    const k = "doc-2";
    const r1 = await store.appendRevision(k, "same", 1);
    const r2 = await store.appendRevision(k, "same", 2);
    expect(r1?.added).toBe(true);
    expect(r2?.added).toBe(false);
    expect(await store.listRevisions(k)).toHaveLength(1);
  });

  it("appends a new revision when content changes, newest last", async () => {
    const k = "doc-3";
    await store.appendRevision(k, "v1", 1);
    await store.appendRevision(k, "v2", 2);
    const list = await store.listRevisions(k);
    expect(list.map((r) => r.content)).toEqual(["v1", "v2"]);
    expect((await store.latestRevision(k))?.content).toBe("v2");
  });

  it("keeps only the last MAX_REVISIONS (drops oldest)", async () => {
    const k = "doc-4";
    for (let i = 0; i < MAX_REVISIONS + 3; i++) {
      await store.appendRevision(k, `v${i}`, i);
    }
    const list = await store.listRevisions(k);
    expect(list).toHaveLength(MAX_REVISIONS);
    // Oldest surviving is v3 (0,1,2 dropped); newest is the last written.
    expect(list[0]!.content).toBe("v3");
    expect(list[list.length - 1]!.content).toBe(`v${MAX_REVISIONS + 2}`);
  });

  it("assigns monotonic ids that survive trims", async () => {
    const k = "doc-5";
    for (let i = 0; i < MAX_REVISIONS + 2; i++) {
      await store.appendRevision(k, `v${i}`, i);
    }
    const ids = (await store.listRevisions(k)).map((r) => Number(r.id));
    // Strictly increasing, and past the trim boundary (> MAX_REVISIONS items written).
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(Math.max(...ids)).toBe(MAX_REVISIONS + 2);
  });

  it("never stores empty content (guards stray '' captures during loads)", async () => {
    const k = "doc-empty";
    expect(await store.appendRevision(k, "", 1)).toBeNull();
    expect(await store.listRevisions(k)).toHaveLength(0);
  });

  it("clearRevisions wipes history", async () => {
    const k = "doc-6";
    await store.appendRevision(k, "a", 1);
    await store.clearRevisions(k);
    expect(await store.listRevisions(k)).toHaveLength(0);
  });

  it("Clear then re-baseline (provider flow): clear → empty → capture current as #1", async () => {
    const k = "doc-clear";
    await store.appendRevision(k, "A", 1);
    await store.clearRevisions(k);
    expect(await store.listRevisions(k)).toHaveLength(0);
    // The provider re-captures the current content right after clearing.
    const r = await store.appendRevision(k, "A", 2);
    expect(r?.added).toBe(true);
    const list = await store.listRevisions(k);
    expect(list.map((x) => x.content)).toEqual(["A"]); // single fresh baseline
  });

  it("enable→edit gives exactly [baseline, edit]; repeat captures of the edit dedup (no spurious 3rd)", async () => {
    const k = "doc-seq";
    await store.appendRevision(k, "A", 1); // enable → baseline
    // Edit to B; capture may fire MORE THAN ONCE for the same edit (load-time
    // content transitions). All but the first must dedup → exactly [A, B].
    await store.appendRevision(k, "B", 2);
    await store.appendRevision(k, "B", 3);
    await store.appendRevision(k, "B", 4);
    const list = await store.listRevisions(k);
    expect(list.map((r) => r.content)).toEqual(["A", "B"]);
  });

  it("serializes concurrent appends without clobbering (the race fix)", async () => {
    const k = "doc-7";
    // Fire all at once — without per-key write serialization these would each
    // read the same empty list and overwrite each other.
    await Promise.all([
      store.appendRevision(k, "v1", 1),
      store.appendRevision(k, "v2", 2),
      store.appendRevision(k, "v3", 3),
    ]);
    expect(await store.listRevisions(k)).toHaveLength(3);
  });

  it("clear racing an append leaves history empty (clear wins when queued last)", async () => {
    const k = "doc-8";
    await store.appendRevision(k, "a", 1);
    // Queue an append and a clear together; the clear is enqueued after, so it
    // runs after the append completes — no resurrection.
    await Promise.all([store.appendRevision(k, "b", 2), store.clearRevisions(k)]);
    expect(await store.listRevisions(k)).toHaveLength(0);
  });
});
