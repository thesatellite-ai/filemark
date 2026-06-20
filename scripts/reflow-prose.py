#!/usr/bin/env python3
"""Reflow hard-wrapped markdown prose to one physical line per paragraph.

Why: the viewer runs `remark-breaks` (single newline -> <br>), so any
source line-wrap shows up as a forced break on screen. Collapsing wrapped
prose (and wrapped list-item continuations) to a single line makes docs
render like GitHub while leaving code fences, tables, ASCII art, etc.
untouched.

Conservative: only merges a line into the previous one when the previous
line is "soft" (prose or a list item) AND the current line is a plain
continuation. Anything that starts a new block flushes the group.
"""
import re
import sys

FENCE = re.compile(r"^\s*(```|~~~)")
HEADING = re.compile(r"^\s{0,3}#{1,6}\s")
HR = re.compile(r"^\s{0,3}([-*_])(\s*\1){2,}\s*$")          # --- *** ___
SETEXT = re.compile(r"^\s{0,3}(=+|-+)\s*$")                  # === or ---
TABLE = re.compile(r"\|")                                    # any pipe row
BLOCKQUOTE = re.compile(r"^\s{0,3}>")
HTML_TAG = re.compile(r"^\s{0,3}<")                          # <Stats> <details> etc.
LIST = re.compile(r"^(\s*)([-*+]|\d+[.)])\s+")              # bullet / ordered
LINKREF = re.compile(r"^\s{0,3}\[[^\]]+\]:\s")              # [ref]: url / [^fn]: ...
INDENT_CODE = re.compile(r"^( {4,}|\t)")                     # indented code block
DIRECTIVE = re.compile(r"^\s{0,3}:::")                       # ::: container


def is_block_start(line: str) -> bool:
    """True if `line` begins a block that must NOT be merged into the prior line."""
    if not line.strip():
        return True
    return bool(
        HEADING.match(line)
        or HR.match(line)
        or SETEXT.match(line)
        or BLOCKQUOTE.match(line)
        or HTML_TAG.match(line)
        or LIST.match(line)
        or LINKREF.match(line)
        or INDENT_CODE.match(line)
        or DIRECTIVE.match(line)
        or TABLE.search(line)
    )


def reflow(text: str) -> str:
    lines = text.split("\n")
    out = []
    i = 0
    n = len(lines)
    in_fence = False
    fence_marker = ""

    # Preserve YAML frontmatter verbatim.
    if lines and lines[0].strip() == "---":
        out.append(lines[0])
        i = 1
        while i < n and lines[i].strip() != "---":
            out.append(lines[i])
            i += 1
        if i < n:
            out.append(lines[i])  # closing ---
            i += 1

    while i < n:
        line = lines[i]

        # Fence toggling — never touch fenced content.
        m = FENCE.match(line)
        if m:
            out.append(line)
            if not in_fence:
                in_fence = True
                fence_marker = m.group(1)
            elif line.strip().startswith(fence_marker):
                in_fence = False
                fence_marker = ""
            i += 1
            continue
        if in_fence:
            out.append(line)
            i += 1
            continue

        # Lines that start a block we keep standalone (but list/prose seed a group).
        if not line.strip():
            out.append(line)
            i += 1
            continue
        if (HEADING.match(line) or HR.match(line) or SETEXT.match(line)
                or BLOCKQUOTE.match(line) or HTML_TAG.match(line)
                or LINKREF.match(line) or INDENT_CODE.match(line)
                or DIRECTIVE.match(line) or TABLE.search(line)):
            out.append(line)
            i += 1
            continue

        # Seed a mergeable group: prose paragraph OR a list item.
        # Merge following lines that are plain continuations (not block starts).
        group = line
        i += 1
        while i < n:
            nxt = lines[i]
            if FENCE.match(nxt) or is_block_start(nxt):
                break
            group = group.rstrip() + " " + nxt.strip()
            i += 1
        out.append(group)

    return "\n".join(out)


def main(paths):
    changed = 0
    for p in paths:
        with open(p, "r", encoding="utf-8") as f:
            src = f.read()
        new = reflow(src)
        if new != src:
            with open(p, "w", encoding="utf-8") as f:
                f.write(new)
            changed += 1
            print(f"reflowed: {p}")
        else:
            print(f"unchanged: {p}")
    print(f"\n{changed} file(s) changed")


if __name__ == "__main__":
    main(sys.argv[1:])
