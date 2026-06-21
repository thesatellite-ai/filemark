import { describe, it, expect } from "vitest";
import { hashContent } from "./hash";

describe("hashContent", () => {
  it("is deterministic — same content, same hash", () => {
    expect(hashContent("# Title\n\nbody")).toBe(hashContent("# Title\n\nbody"));
  });

  it("differs when content changes (the dedup signal)", () => {
    expect(hashContent("hello world")).not.toBe(hashContent("hello  world"));
    expect(hashContent("a")).not.toBe(hashContent("b"));
  });

  it("returns a stable 8-char lowercase hex string", () => {
    expect(hashContent("anything")).toMatch(/^[0-9a-f]{8}$/);
    expect(hashContent("")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("is sensitive to ordering (not a commutative sum)", () => {
    expect(hashContent("ab")).not.toBe(hashContent("ba"));
  });
});
