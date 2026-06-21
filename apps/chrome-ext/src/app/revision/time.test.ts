import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./time";

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("says 'just now' under 5 seconds", () => {
    expect(formatRelativeTime(1000, 1000)).toBe("just now");
    expect(formatRelativeTime(1000, 1000 + 4 * SEC)).toBe("just now");
  });

  it("formats seconds, minutes, hours, days", () => {
    const t = 1_000_000;
    expect(formatRelativeTime(t, t + 12 * SEC)).toBe("12s ago");
    expect(formatRelativeTime(t, t + 3 * MIN)).toBe("3m ago");
    expect(formatRelativeTime(t, t + 5 * HOUR)).toBe("5h ago");
    expect(formatRelativeTime(t, t + 2 * DAY)).toBe("2d ago");
  });

  it("never goes negative when `now` precedes `from` (clock skew)", () => {
    expect(formatRelativeTime(2000, 1000)).toBe("just now");
  });
});
