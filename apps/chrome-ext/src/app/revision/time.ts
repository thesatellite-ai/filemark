// REVISION MODE — relative-time formatting (feature map: revision/RevisionProvider.tsx).
//
// Single source for the "2m ago" style labels the bar and panel both show, so
// they never drift apart. Pure (takes `now` explicitly rather than reading the
// clock) → deterministic and unit-testable.

/** Seconds below which we say "just now" rather than "Ns ago". */
const JUST_NOW_SECONDS = 5;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

/**
 * Compact relative time, e.g. "just now" / "12s ago" / "3m ago" / "5h ago" /
 * "2d ago". `from` and `now` are epoch ms; passing `now` keeps it pure (no
 * hidden Date.now()) so callers control refresh cadence and tests are stable.
 */
export function formatRelativeTime(from: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - from) / 1000));
  if (seconds < JUST_NOW_SECONDS) return "just now";
  if (seconds < SECONDS_PER_MINUTE) return `${seconds}s ago`;
  const minutes = Math.round(seconds / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) return `${minutes}m ago`;
  const hours = Math.round(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `${hours}h ago`;
  return `${Math.round(hours / HOURS_PER_DAY)}d ago`;
}
