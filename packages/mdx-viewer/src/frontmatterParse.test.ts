import { describe, it, expect } from "vitest";
import { extractFrontmatter, frontmatterLineOffset } from "./frontmatterParse";

describe("extractFrontmatter", () => {
  it("splits valid frontmatter from the body", () => {
    const { frontData, body } = extractFrontmatter(
      "---\ntitle: Hi\n---\n\n# Body\n",
    );
    expect(frontData).toEqual({ title: "Hi" });
    expect(body).toBe("\n# Body\n");
  });

  it("returns whole input as body when there is no frontmatter", () => {
    const src = "# Just a heading\n\ntext";
    const { frontData, body } = extractFrontmatter(src);
    expect(frontData).toEqual({});
    expect(body).toBe(src);
  });

  it("treats a non-object YAML fence as body (no strip)", () => {
    // `- a` parses to an array, not an object → not accepted as frontmatter.
    const src = "---\n- a\n- b\n---\nbody";
    expect(extractFrontmatter(src).body).toBe(src);
  });

  it("handles CRLF line endings", () => {
    const { frontData, body } = extractFrontmatter(
      "---\r\ntitle: Hi\r\n---\r\nbody",
    );
    expect(frontData).toEqual({ title: "Hi" });
    expect(body).toBe("body");
  });
});

describe("frontmatterLineOffset", () => {
  it("is 0 when there is no frontmatter", () => {
    expect(frontmatterLineOffset("# heading\n\ntext")).toBe(0);
  });

  it("counts the stripped lines for a 3-line fence", () => {
    // ---\ntitle: Hi\n---\n  → 3 newlines removed, body starts at file line 4.
    expect(frontmatterLineOffset("---\ntitle: Hi\n---\n\n# Body")).toBe(3);
  });

  it("is 0 for an invalid (non-object) fence, matching extractFrontmatter", () => {
    expect(frontmatterLineOffset("---\n- a\n---\nbody")).toBe(0);
  });

  it("counts a multi-key fence correctly", () => {
    // ---\na: 1\nb: 2\n---\n → 4 newlines.
    expect(frontmatterLineOffset("---\na: 1\nb: 2\n---\nbody")).toBe(4);
  });
});
