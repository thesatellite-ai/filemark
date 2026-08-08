import { describe, it, expect } from "vitest";
import { normalizeMathFences } from "./normalizeMath";

describe("normalizeMathFences", () => {
  it("splits a multi-line block whose fences share a line with LaTeX", () => {
    const input = "$$ \\begin{aligned} a &= b \\\\\n c &= d\n\\end{aligned} $$";
    const expected =
      "$$\n\\begin{aligned} a &= b \\\\\n c &= d\n\\end{aligned}\n$$";
    expect(normalizeMathFences(input)).toBe(expected);
  });

  it("leaves a canonical block byte-for-byte unchanged", () => {
    const input = "$$\n\\begin{aligned}\na=b\n\\end{aligned}\n$$";
    expect(normalizeMathFences(input)).toBe(input);
  });

  it("leaves a single-line block ($$ … $$) unchanged", () => {
    expect(normalizeMathFences("$$ x = 1 $$")).toBe("$$ x = 1 $$");
  });

  it("leaves inline $$…$$ in prose unchanged", () => {
    const input = "The value $$x$$ is here.";
    expect(normalizeMathFences(input)).toBe(input);
  });

  it("does not touch $$ inside fenced code blocks", () => {
    const input = "```\n$$ not math $$\n$$ also not\n```";
    expect(normalizeMathFences(input)).toBe(input);
  });

  it("returns input unchanged when there is no $$ at all (fast path)", () => {
    const input = "# Hello\n\nplain text\n";
    expect(normalizeMathFences(input)).toBe(input);
  });

  it("splits a bare closing fence with leading content", () => {
    expect(normalizeMathFences("\\end{aligned} $$")).toBe(
      "\\end{aligned}\n$$",
    );
  });

  it("preserves indentation on the moved fence", () => {
    expect(normalizeMathFences("  $$ x")).toBe("  $$\nx");
  });

  it("handles CRLF-free multi-fence docs without corrupting other content", () => {
    const input = "a\n\n$$ E=mc^2 $$\n\ntext after";
    // single-line block untouched; surrounding text intact
    expect(normalizeMathFences(input)).toBe(input);
  });
});
