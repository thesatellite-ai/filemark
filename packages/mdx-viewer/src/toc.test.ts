import { describe, it, expect } from "vitest";
import { tocIndentLevels, TOC_INDENT_STEP_PX } from "./toc";

describe("tocIndentLevels", () => {
  it("anchors on h1 when the doc starts at h1 (the reported bug)", () => {
    // # test / ## test1 / ### test2  →  0, 1, 2 (h1 flush-left, nested below)
    expect(tocIndentLevels([1, 2, 3])).toEqual([0, 1, 2]);
    // The specific case from the report: # then ## must NOT collide.
    expect(tocIndentLevels([1, 2])).toEqual([0, 1]);
  });

  it("still works with NO h1 — h2 becomes the flush-left baseline", () => {
    // ## / ## / ### / ####  →  0, 0, 1, 2 (identical to the old good behavior)
    expect(tocIndentLevels([2, 2, 3, 4])).toEqual([0, 0, 1, 2]);
  });

  it("anchors on whatever the shallowest heading is (h3-only doc)", () => {
    expect(tocIndentLevels([3, 3, 4])).toEqual([0, 0, 1]);
  });

  it("preserves a skipped level as a gap (# then ### with no ##)", () => {
    expect(tocIndentLevels([1, 3])).toEqual([0, 2]);
  });

  it("handles a realistic mixed outline", () => {
    // # A / ## B / ## C / ### D / ## E  →  0,1,1,2,1
    expect(tocIndentLevels([1, 2, 2, 3, 2])).toEqual([0, 1, 1, 2, 1]);
  });

  it("is total: single item is flush-left, empty input is empty", () => {
    expect(tocIndentLevels([2])).toEqual([0]);
    expect(tocIndentLevels([])).toEqual([]);
  });

  it("indent step is a positive pixel constant (drives the inline padding)", () => {
    expect(TOC_INDENT_STEP_PX).toBeGreaterThan(0);
  });
});
