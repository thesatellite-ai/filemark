# GitHub-Flavored Markdown — full reference

A complete tour of **GitHub-Flavored Markdown (GFM)**. Every standard construct GitHub renders is exercised below, top to bottom. Use it to eyeball the renderer or as a copy-paste cheat sheet.

> This document is plain GFM only — no Filemark components. If it renders cleanly here, it renders cleanly on GitHub.

---

## 1. Headings

# H1 heading
## H2 heading
### H3 heading
#### H4 heading
##### H5 heading
###### H6 heading

Alternate syntax:

Setext H1
=========

Setext H2
---------

## 2. Paragraphs & line breaks

This is one paragraph. It wraps as a single block of prose with no hard breaks in the middle, and the renderer decides where the visual line wrapping happens based on the viewport width.

This is a second paragraph, separated from the first by a blank line.

A line ending with two trailing spaces forces a hard break — this text should sit on its own line directly below.

## 3. Emphasis

- *Italic with asterisks* and _italic with underscores_
- **Bold with asterisks** and __bold with underscores__
- ***Bold italic*** and ___bold italic___
- ~~Strikethrough~~ (GFM extension)
- `Inline code` inside a sentence
- Combined: **bold with `code` inside** and *italic with [a link](https://example.com)*

## 4. Blockquotes

> A single-level blockquote.
>
> Second paragraph inside the same quote.
>
> > A nested blockquote, one level deeper.
> >
> > > And a third level.

> Blockquote containing **bold**, a list, and code:
>
> - item one
> - item two
>
> ```js
> const inside = "a code block in a quote";
> ```

## 5. Lists

### Unordered

- First item
- Second item
  - Nested item A
  - Nested item B
    - Deeply nested
- Third item

### Ordered

1. First step
2. Second step
   1. Sub-step one
   2. Sub-step two
3. Third step

### Mixed & loose

1. Ordered parent

   With a paragraph belonging to the item.

   - Unordered child
   - Another child

2. Second ordered parent

### Task lists (GFM)

- [x] Completed task
- [ ] Incomplete task
- [x] Another done item
  - [ ] Nested incomplete subtask
  - [x] Nested done subtask

## 6. Code

Inline: use `git status` to inspect the working tree, call `Array.prototype.map()`.

Indented code block (four spaces):

    function plain() {
      return "no language hint";
    }

Fenced block with language (syntax highlighting):

```ts
interface User {
  id: string;
  name: string;
  roles: ("admin" | "editor" | "viewer")[];
}

export function greet(u: User): string {
  return `Hello, ${u.name} (${u.roles.join(", ")})`;
}
```

```python
def fib(n: int) -> int:
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
```

```bash
# shell session
curl -fsSL https://example.com/install.sh | sh
echo "done"
```

```json
{
  "name": "filemark",
  "private": true,
  "scripts": { "build": "vite build" }
}
```

```diff
- const old = "removed line";
+ const next = "added line";
  const same = "context line";
```

## 7. Tables (GFM)

Basic table with column alignment:

| Feature        | Default       | Configurable |
| :------------- | :-----------: | -----------: |
| Left aligned   |    Centered   | Right aligned |
| Markdown cells | **bold** here | `code` here  |
| Links          | [docs](https://example.com) | ~~strike~~ |
| Long content   | wraps to the available column width without breaking the layout | ✓ |

Minimal table (no outer pipes):

Name | Role | Active
---|---|---
Ada | Admin | yes
Grace | Editor | no

## 8. Links & images

- Inline link: [Filemark](https://khanakia.com/apps/filemark/)
- Link with title: [hover me](https://example.com "A title tooltip")
- Reference link: [reference style][ref]
- Autolink (bare URL, GFM): https://example.com
- Autolink email: <hello@example.com>
- Relative link: [another doc](./showcase.md)

[ref]: https://example.com/reference "Reference definition"

Image (inline):

![Filemark logo placeholder](https://placehold.co/120x40/2563eb/ffffff?text=filemark)

Linked image:

[![clickable badge](https://placehold.co/100x20/16a34a/ffffff?text=passing)](https://example.com)

## 9. Horizontal rules

Three or more hyphens, asterisks, or underscores:

---

***

___

## 10. Footnotes (GFM)

Here is a statement that needs a citation.[^1] And here is another point with a longer note.[^longnote]

[^1]: The first footnote definition.
[^longnote]: Footnotes can contain multiple sentences. They render at the bottom of the document with a back-reference link to where they were cited.

## 11. Inline HTML

GFM allows a safe subset of inline HTML:

This sentence has <kbd>⌘</kbd> + <kbd>K</kbd> rendered as keyboard keys.

Text with <sub>subscript</sub> and <sup>superscript</sup>.

<details>
<summary>Click to expand a native &lt;details&gt; element</summary>

Hidden content revealed on toggle — including **markdown** inside.

- list item inside details
- second item

</details>

An abbreviation: <abbr title="GitHub-Flavored Markdown">GFM</abbr>.

## 12. Escaping & special characters

Escaped characters render literally: \*not italic\*, \`not code\`, \# not a heading, \[not a link\].

Entities: &copy; &mdash; &rarr; &hearts; &amp; &lt; &gt;

Literal ampersand in prose: AT&T, R&D, fish & chips.

## 13. Emoji (GFM shortcodes)

Standard gemoji shortcodes render as Unicode emoji:

:smile: :tada: :rocket: :fire: :sparkles: :thumbsup: :eyes: :100: :white_check_mark: :warning: :bug: :memo: :bulb: :heart: :star: :coffee: :wave: :checkered_flag:

Inline in a sentence: shipping it :rocket: and it works :tada:

## 14. Strikethrough, autolink edge cases

- Strikethrough: ~~this whole phrase is struck~~
- Autolinked www (GFM): www.example.com
- URL with path & query: https://example.com/path?foo=bar&baz=qux#section

## 15. Hard cases

A table cell with a pipe needs escaping: 

| Expression | Result |
|---|---|
| `a \| b` | bitwise-or |
| `x && y` | logical-and |

Nested emphasis and code together: **`bold code`**, *`italic code`*, `code with *no* emphasis inside`.

A very long inline code span to test horizontal overflow handling: `const url = "https://example.com/a/very/long/path/that/should/not/break/the/page/layout?with=query&and=more"`

---

> **End of reference.** If every section above rendered correctly, the GFM pipeline is healthy. :white_check_mark:
