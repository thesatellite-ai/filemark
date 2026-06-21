import { describe, it, expect } from "vitest";
import { buildSourceDiff } from "./source";

describe("buildSourceDiff", () => {
  it("reports no change for identical input", () => {
    const d = buildSourceDiff("a\nb\nc", "a\nb\nc");
    expect(d.changed).toBe(false);
    expect(d.added).toBe(0);
    expect(d.removed).toBe(0);
    expect(d.unified.every((r) => r.type === "context")).toBe(true);
  });

  it("counts added and removed lines", () => {
    // Newline-terminated so the trailing line isn't folded into the diff by
    // jsdiff's EOF-newline handling.
    const d = buildSourceDiff("a\nb\nc\n", "a\nB\nc\nd\n");
    expect(d.changed).toBe(true);
    expect(d.removed).toBe(1); // b
    expect(d.added).toBe(2); // B, d
  });

  it("unified rows carry correct old/new line numbers for context", () => {
    const d = buildSourceDiff("x\ny", "x\ny");
    const ctx = d.unified.filter((r) => r.type === "context");
    expect(ctx[0]).toMatchObject({ oldNo: 1, newNo: 1 });
    expect(ctx[1]).toMatchObject({ oldNo: 2, newNo: 2 });
  });

  it("split view pairs a modified line (del on left, add on right, same row)", () => {
    const d = buildSourceDiff("a\nold\nc", "a\nnew\nc");
    const modRow = d.split.find(
      (r) => r.left?.type === "del" && r.right?.type === "add",
    );
    expect(modRow).toBeDefined();
    expect(modRow?.left?.text).toBe("old");
    expect(modRow?.right?.text).toBe("new");
  });

  it("split view leaves an empty cell for an unbalanced add", () => {
    const d = buildSourceDiff("a", "a\nb");
    const addOnly = d.split.find((r) => r.right?.type === "add" && r.left === null);
    expect(addOnly?.right?.text).toBe("b");
  });
});
