import { describe, it, expect } from "vitest";
import { toggleTaskMarker } from "./taskToggle";

/** Apply a returned toggle to a line to assert the resulting text. */
function apply(line: string): string {
  const t = toggleTaskMarker(line);
  if (!t) return line;
  return line.slice(0, t.col) + t.next + line.slice(t.col + 1);
}

describe("toggleTaskMarker", () => {
  it("checks an unchecked task", () => {
    expect(apply("- [ ] buy milk")).toBe("- [x] buy milk");
  });

  it("unchecks a done task", () => {
    expect(apply("- [x] done")).toBe("- [ ] done");
  });

  it("treats [X] (caps) as done → unchecks it", () => {
    expect(apply("- [X] caps done")).toBe("- [ ] caps done");
  });

  it("moves any non-done status (wip/blocked/…) to done", () => {
    expect(apply("* [/] wip")).toBe("* [x] wip");
    expect(apply("- [!] blocked")).toBe("- [x] blocked");
    expect(apply("+ [?] question")).toBe("+ [x] question");
  });

  it("preserves indentation and reports the right column", () => {
    const t = toggleTaskMarker("  - [ ] nested");
    expect(t).toEqual({ col: 5, next: "x" });
    expect(apply("  - [ ] nested")).toBe("  - [x] nested");
  });

  it("returns null for a non-task bullet", () => {
    expect(toggleTaskMarker("- not a task")).toBeNull();
  });

  it("returns null for an ordered-list 'task' (not GFM)", () => {
    expect(toggleTaskMarker("1. [ ] ordered")).toBeNull();
  });

  it("returns null for a blank line", () => {
    expect(toggleTaskMarker("")).toBeNull();
  });
});
