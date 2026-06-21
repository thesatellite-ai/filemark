import { describe, it, expect } from "vitest";
import { buildDiffNodes, defaultPair, CURRENT_ID } from "./compare";
import type { Revision } from "./types";

const rev = (id: string, content: string): Revision => ({
  id,
  content,
  hash: content,
  capturedAt: 0,
});

describe("buildDiffNodes", () => {
  it("omits Current when it equals the latest stored revision", () => {
    // The user's exact case: #1=A, #2=B, on-screen content is still B.
    const nodes = buildDiffNodes([rev("1", "A"), rev("2", "B")], "B");
    expect(nodes.map((n) => n.id)).toEqual(["1", "2"]); // no Current
  });

  it("appends Current when the live content differs (uncommitted edit)", () => {
    const nodes = buildDiffNodes([rev("1", "A"), rev("2", "B")], "C");
    expect(nodes.map((n) => n.id)).toEqual(["1", "2", CURRENT_ID]);
    expect(nodes[nodes.length - 1]!.content).toBe("C");
  });

  it("with one revision + a live edit, offers #1 → Current", () => {
    const nodes = buildDiffNodes([rev("1", "A")], "B");
    expect(nodes.map((n) => n.id)).toEqual(["1", CURRENT_ID]);
  });

  it("with one revision and no live change, has a single node (no #1 → #1)", () => {
    const nodes = buildDiffNodes([rev("1", "A")], "A");
    expect(nodes).toHaveLength(1);
  });

  it("empty content does not add a Current node", () => {
    expect(buildDiffNodes([rev("1", "A")], "")).toHaveLength(1);
  });
});

describe("defaultPair", () => {
  it("defaults to the last two stored revisions (#1 → #2) — the change to review", () => {
    const nodes = buildDiffNodes([rev("1", "A"), rev("2", "B")], "B");
    expect(defaultPair(nodes)).toEqual({ oldId: "1", newId: "2" });
  });

  it("defaults to latest → Current when there's an uncommitted live edit", () => {
    const nodes = buildDiffNodes([rev("1", "A"), rev("2", "B")], "C");
    expect(defaultPair(nodes)).toEqual({ oldId: "2", newId: CURRENT_ID });
  });

  it("returns null when fewer than two nodes", () => {
    expect(defaultPair(buildDiffNodes([rev("1", "A")], "A"))).toBeNull();
    expect(defaultPair([])).toBeNull();
  });
});
