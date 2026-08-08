import { describe, it, expect } from "vitest";
import { topForLine, lineAtY, type LineMark } from "./scrollMath";

// A few anchors with deliberately NON-linear line→top spacing (as real docs
// have: a tall heading, then dense paragraphs), so interpolation is exercised.
const MARKS: LineMark[] = [
  { line: 1, top: 0 },
  { line: 5, top: 100 },
  { line: 6, top: 400 },
  { line: 20, top: 800 },
];

describe("topForLine", () => {
  it("returns null with no anchors", () => {
    expect(topForLine([], 3)).toBeNull();
  });

  it("is exact at an anchor line", () => {
    expect(topForLine(MARKS, 5)).toBe(100);
    expect(topForLine(MARKS, 6)).toBe(400);
  });

  it("interpolates linearly between anchors", () => {
    // halfway (line 3) between line1@0 and line5@100 → 50
    expect(topForLine(MARKS, 3)).toBe(50);
  });

  it("clamps to the first/last anchor outside the range", () => {
    expect(topForLine(MARKS, 0)).toBe(0);
    expect(topForLine(MARKS, 999)).toBe(800);
  });
});

describe("lineAtY", () => {
  it("returns null with no anchors", () => {
    expect(lineAtY([], 100)).toBeNull();
  });

  it("is exact at an anchor top", () => {
    expect(lineAtY(MARKS, 100)).toBe(5);
    expect(lineAtY(MARKS, 400)).toBe(6);
  });

  it("interpolates linearly between anchors", () => {
    // y=50 is halfway between top0@line1 and top100@line5 → line 3
    expect(lineAtY(MARKS, 50)).toBe(3);
  });
});

describe("topForLine ∘ lineAtY round-trip", () => {
  it("recovers the original Y at several positions", () => {
    for (const y of [0, 50, 100, 250, 400, 600, 800]) {
      const line = lineAtY(MARKS, y);
      expect(line).not.toBeNull();
      expect(topForLine(MARKS, line as number)).toBeCloseTo(y, 6);
    }
  });
});
