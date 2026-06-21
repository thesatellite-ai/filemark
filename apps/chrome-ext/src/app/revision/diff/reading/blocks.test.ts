import { describe, it, expect } from "vitest";
import { splitBlocks, blockKind, pairDiff, parseTable } from "./blocks";

describe("splitBlocks", () => {
  it("splits on blank lines", () => {
    expect(splitBlocks("a\n\nb\n\nc")).toEqual(["a", "b", "c"]);
  });

  it("keeps a fenced code block atomic (blank lines inside don't split it)", () => {
    const src = "intro\n\n```js\nconst x = 1\n\nconst y = 2\n```\n\nafter";
    const blocks = splitBlocks(src);
    expect(blocks).toHaveLength(3);
    expect(blocks[1]).toBe("```js\nconst x = 1\n\nconst y = 2\n```");
  });

  it("keeps a tight table (no blank lines) as one block", () => {
    const table = "| a | b |\n|---|---|\n| 1 | 2 |";
    expect(splitBlocks(table)).toEqual([table]);
  });
});

describe("blockKind", () => {
  it("classifies the common shapes", () => {
    expect(blockKind("```js\nx\n```")).toBe("code");
    expect(blockKind("| a | b |\n|---|---|\n| 1 | 2 |")).toBe("table");
    expect(blockKind("## Heading")).toBe("heading");
    expect(blockKind("- item one\n- item two")).toBe("list");
    expect(blockKind("just some prose")).toBe("prose");
  });
});

describe("pairDiff", () => {
  const key = (s: string) => s;

  it("marks unchanged items as same", () => {
    const units = pairDiff(["a", "b"], ["a", "b"], key);
    expect(units.every((u) => u.kind === "same")).toBe(true);
  });

  it("zips an adjacent remove+add into a single mod pair", () => {
    const units = pairDiff(["a", "old", "c"], ["a", "new", "c"], key);
    const mod = units.find((u) => u.kind === "mod");
    expect(mod).toBeDefined();
    expect(mod).toMatchObject({ kind: "mod", a: "old", b: "new" });
  });

  it("reports pure add and pure del", () => {
    expect(pairDiff(["a"], ["a", "b"], key).some((u) => u.kind === "add")).toBe(true);
    expect(pairDiff(["a", "b"], ["a"], key).some((u) => u.kind === "del")).toBe(true);
  });
});

describe("parseTable", () => {
  it("parses header + rows, skipping the delimiter row", () => {
    const t = parseTable("| Name | Age |\n|---|---|\n| Ann | 30 |\n| Bob | 25 |");
    expect(t.header).toEqual(["Name", "Age"]);
    expect(t.rows).toEqual([
      ["Ann", "30"],
      ["Bob", "25"],
    ]);
  });
});
