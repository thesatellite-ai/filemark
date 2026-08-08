import { describe, it, expect } from "vitest";
import { ZOOM_MIN, ZOOM_MAX, clampZoom } from "./constants";

describe("clampZoom", () => {
  it("passes an in-range value through (snapped)", () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(1.2)).toBe(1.2);
  });

  it("clamps below the minimum", () => {
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
    expect(clampZoom(-5)).toBe(ZOOM_MIN);
  });

  it("clamps above the maximum", () => {
    expect(clampZoom(99)).toBe(ZOOM_MAX);
  });

  it("snaps to one-decimal steps so 100% is always reachable", () => {
    expect(clampZoom(1.04)).toBe(1);
    expect(clampZoom(1.06)).toBe(1.1);
  });
});
