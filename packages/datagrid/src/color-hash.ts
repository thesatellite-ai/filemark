/** Stable FNV-1a hash → palette index. Same input, same color, forever. */

const TAG_PALETTE = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30",
  "bg-lime-600/15 text-lime-700 dark:text-lime-300 border-lime-500/30",
] as const;

const AVATAR_PALETTE = [
  "bg-blue-500 text-white",
  "bg-emerald-500 text-white",
  "bg-amber-500 text-white",
  "bg-rose-500 text-white",
  "bg-violet-500 text-white",
  "bg-cyan-500 text-white",
  "bg-fuchsia-500 text-white",
  "bg-slate-500 text-white",
] as const;

export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function tagColorClass(s: string): string {
  return TAG_PALETTE[hashString(s.toLowerCase()) % TAG_PALETTE.length]!;
}

export function avatarColorClass(s: string): string {
  return AVATAR_PALETTE[hashString(s.toLowerCase()) % AVATAR_PALETTE.length]!;
}
