/**
 * Shared config for FSA (File System Access) offline content caching.
 *
 * Why this module exists: both `fs.ts` (caches text at folder-scan time) and
 * `store.ts` (caches on view + backfills after reconnect) need the SAME size
 * cap, but `fs.ts` type-imports from `store.ts`, so a value import between them
 * risks a circular runtime dependency (which is why `store.ts` reaches fs
 * helpers via dynamic `import()`). A neutral, dependency-free module lets both
 * import the cap statically with zero cycle risk — one source of truth.
 */

/**
 * Upper bound (bytes) on a single file's text we'll cache to IndexedDB for
 * offline viewing. Chrome resets FSA permission to "prompt" every page load,
 * so a cached copy is the only way folder files stay viewable after a reload;
 * this cap just stops one pathological multi-MB file from bloating IDB.
 * Renderable docs (md / csv / json) are almost always far under it, and
 * oversized files still open live via their handle.
 */
export const FSA_CACHE_MAX_BYTES = 2_000_000;
