# Rendering verification

A quick kitchen-sink to eyeball that the renderer is behaving — GitHub-flavored markdown, emoji shortcodes, code, math, and a component. If everything below looks right, the pipeline is healthy.

## Text formatting

**Bold**, _italic_, **_bold italic_**, ~~strikethrough~~, `inline code`, and a [link](https://khanakia.com/apps/filemark/). Autolink: https://example.com

> A blockquote — should have a left accent bar and muted text.

---

## Emoji shortcodes (GitHub gemoji)

These should all render as real emoji, not literal `:code:` text:

:smile: :laughing: :wink: :blush: :heart_eyes: :thumbsup: :tada: :rocket: :fire: :sparkles: :eyes: :100: :white_check_mark: :warning: :bug: :memo: :bulb: :zap: :star: :coffee:

Inline in a sentence: shipping it :rocket: and it works :tada: — nice :sunglasses:

> Note: `:bowtie:` is a GitHub-proprietary custom emoji (an image, not Unicode), so it intentionally stays literal.

## Lists

- Unordered item one
- Unordered item two
  - Nested item
- Item three

1. Ordered one
2. Ordered two
3. Ordered three

## Task list

- [x] Done item
- [ ] Todo item
- [ ] Another todo

## Table

| Feature | Status | Notes |
|---|---|---|
| GFM tables | ✅ | sortable header look |
| Emoji | :tada: | gemoji shortcodes |
| Strikethrough | ~~old~~ | GFM |
| Autolinks | ✅ | bare URLs |

## Code block

```ts
interface ViewerProps {
  content: string;
  file: FileRef;
}

export function render(props: ViewerProps): string {
  // syntax highlighting via Shiki
  return props.content.trim();
}
```

## Math

Inline: $E = mc^2$. Block:

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

## Callout (filemark component)

<Callout type="tip" title="Looks good?">

If the emoji above are real glyphs, the table has borders, code is highlighted, and this callout has an accent + icon — rendering is verified. :white_check_mark:

</Callout>
