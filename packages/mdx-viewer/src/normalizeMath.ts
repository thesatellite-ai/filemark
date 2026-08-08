// Auto-repair for block math whose `$$` fences share a line with LaTeX.
//
// Micromark's math-flow parser treats any text after an opening `$$` as an
// "info string" (like the `js` in a ```js code fence) and requires a line that
// is *just* `$$` to close the block. So a multi-line block written as
//
//     $$ \begin{aligned} f(x) &= (x+1)^2 \\
//        &= x^2 + 2x + 1
//     \end{aligned} $$
//
// mis-parses: the opening line's LaTeX is discarded, no closing fence is found,
// and the block swallows the rest of the document as one giant (invalid) math
// node — a single typo breaks everything below it.
//
// This normalizes such fences onto their own lines BEFORE parsing:
//     `$$ <latex>`  (opening: one `$$` at line start, content after)  → `$$` \n `<latex>`
//     `<latex> $$`  (closing: one `$$` at line end, content before)   → `<latex>` \n `$$`
//
// Left untouched: single-line `$$ … $$` (two fences on the line, which already
// works), `$$` already alone on its line, and anything inside a fenced code
// block. A doc written canonically is returned byte-for-byte unchanged, so the
// common case pays nothing (and its source line numbers don't shift).

const CODE_FENCE = /^\s*(```|~~~)/;
// Opening fence: leading `$$`, then LaTeX to end of line (no closing `$$`).
const OPEN_FENCE = /^(\s*)\$\$[ \t]*(\S.*?)[ \t]*$/;
// Closing fence: LaTeX, then a trailing `$$` at end of line.
const CLOSE_FENCE = /^(\s*)(\S.*?)[ \t]*\$\$[ \t]*$/;

export function normalizeMathFences(md: string): string {
  // Fast path: no `$$` at all → nothing to do.
  if (!md.includes("$$")) return md;

  const lines = md.split("\n");
  const out: string[] = [];
  let inCode = false;

  for (const line of lines) {
    if (CODE_FENCE.test(line)) {
      inCode = !inCode;
      out.push(line);
      continue;
    }
    if (inCode) {
      out.push(line);
      continue;
    }
    // Only single-fence lines are candidates; `$$ … $$` (count 2) already works.
    const fenceCount = (line.match(/\$\$/g) ?? []).length;
    if (fenceCount === 1) {
      const open = OPEN_FENCE.exec(line);
      if (open) {
        out.push(`${open[1]}$$`, open[2]);
        continue;
      }
      const close = CLOSE_FENCE.exec(line);
      if (close) {
        out.push(close[2], `${close[1]}$$`);
        continue;
      }
    }
    out.push(line);
  }

  return out.join("\n");
}
