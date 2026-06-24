// @vitest-environment jsdom
//
// Regression coverage for the note-highlight range engine. The bug that
// shipped: a selection spanning a line/block break carries newlines from
// `getSelection().toString()` that the flattened DOM text (concatenated text
// nodes, no separators) doesn't have, so the exact match failed → no highlight
// painted AND nothing to navigate to. These tests lock in the
// whitespace-insensitive fallback so multi-line selections always anchor.

import { describe, it, expect, beforeEach } from "vitest";
import { anchorIndexOf, getBody, resolveRange } from "./highlight";

/** Render a `.fv-mdx-body` with the given inner HTML and return it. */
function mountBody(html: string): HTMLElement {
  document.body.innerHTML = `<article class="fv-mdx-body">${html}</article>`;
  const body = getBody();
  if (!body) throw new Error("body not mounted");
  return body;
}

/** Strip whitespace for tolerant comparison of resolved range text. */
const skel = (s: string) => s.replace(/\s+/g, "");

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("resolveRange — exact (single block)", () => {
  it("resolves a quote within one paragraph", () => {
    const body = mountBody("<p>If Aman has $150k to invest, that's the budget.</p>");
    const r = resolveRange(body, "$150k to invest", 0);
    expect(r).not.toBeNull();
    expect(r!.toString()).toBe("$150k to invest");
  });

  it("returns null when the quote isn't present", () => {
    const body = mountBody("<p>nothing to see here</p>");
    expect(resolveRange(body, "this text does not exist", 0)).toBeNull();
  });
});

describe("resolveRange — cross-block selection (the regression)", () => {
  it("anchors a selection spanning two paragraphs (quote contains a newline)", () => {
    const body = mountBody(
      "<p>If Aman has $150k to invest</p><p>there's no point considering $500k.</p>",
    );
    // What getSelection().toString() yields across the two <p> blocks: a
    // newline the flattened DOM text ("…investthere's…") never has.
    const quote = "to invest\nthere's no point";
    const r = resolveRange(body, quote, 0);
    expect(r).not.toBeNull();
    // The resolved range covers the same characters, ignoring whitespace.
    expect(skel(r!.toString())).toBe(skel(quote));
  });

  it("anchors across more than two blocks with extra blank lines", () => {
    const body = mountBody(
      "<h2>Step 1</h2><p>throw out the impossible ones</p><ul><li>under budget</li></ul>",
    );
    const quote = "impossible ones\n\nunder budget";
    const r = resolveRange(body, quote, 0);
    expect(r).not.toBeNull();
    expect(skel(r!.toString())).toBe(skel(quote));
  });

  it("tolerates differing whitespace amount within a block", () => {
    const body = mountBody("<p>alpha     beta gamma</p>");
    // Quote collapsed the runs of spaces.
    const r = resolveRange(body, "alpha beta gamma", 0);
    expect(r).not.toBeNull();
    expect(skel(r!.toString())).toBe("alphabetagamma");
  });
});

describe("resolveRange — repeated text disambiguation", () => {
  it("picks the occurrence closest to the anchor index", () => {
    const body = mountBody(
      "<p>cost is $500k here</p><p>middle filler text</p><p>also $500k there</p>",
    );
    const near0 = resolveRange(body, "$500k", 0);
    const nearEnd = resolveRange(body, "$500k", 9999);
    expect(near0).not.toBeNull();
    expect(nearEnd).not.toBeNull();
    // Different instances → different flat positions.
    expect(anchorIndexOf(body, near0!)).toBeLessThan(anchorIndexOf(body, nearEnd!));
  });
});

describe("anchorIndexOf ↔ resolveRange round-trip", () => {
  it("re-resolves the same span from a computed anchor", () => {
    const body = mountBody("<p>one</p><p>two has a $target token</p><p>three</p>");
    // Build a real range over "$target" in the second paragraph.
    const textNode = body.querySelectorAll("p")[1]!.firstChild as Text;
    const start = textNode.data.indexOf("$target");
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, start + "$target".length);

    const anchor = anchorIndexOf(body, range);
    const resolved = resolveRange(body, "$target", anchor);
    expect(resolved).not.toBeNull();
    expect(resolved!.toString()).toBe("$target");
    expect(anchorIndexOf(body, resolved!)).toBe(anchor);
  });
});
