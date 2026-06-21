// REVISION MODE — content checksum (feature map: revision/RevisionProvider.tsx).
//
// Pure, synchronous FNV-1a (32-bit). This is a DEDUP key, not a security hash:
// we only need "did the content change since the last revision?", so a fast
// non-cryptographic hash with a vanishingly small collision rate on doc-sized
// text is the right tool — no async crypto.subtle, no await on the render path.
//
// Stable across reloads and machines (depends only on the text), so the same
// content always yields the same hash → identical content never creates a
// duplicate revision.

/**
 * FNV-1a hash of `content`, returned as an 8-char lowercase hex string.
 * Empty input hashes to the FNV offset basis (a stable, non-empty value).
 */
export function hashContent(content: string): string {
  // FNV-1a 32-bit: offset basis 0x811c9dc5, prime 0x01000193.
  let h = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    // `Math.imul` keeps the multiply in 32-bit space (avoids float drift).
    h = Math.imul(h, 0x01000193);
  }
  // `>>> 0` coerces to an unsigned 32-bit int before hex-stringifying.
  return (h >>> 0).toString(16).padStart(8, "0");
}
