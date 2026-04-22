// Embedded welcome document shown on first run. Demonstrates every supported
// feature so the user immediately sees what the viewer can do. Also acts as
// an implicit smoke test: if rendering breaks, this page looks wrong.

export const WELCOME_DOC = `---
title: Welcome to Filemark
description: A beautiful in-browser viewer for markdown. Drop a file or open a folder to replace this page.
tags: [markdown, mdx, chrome-extension, shadcn]
version: 0.1.0
updated: 2026-04-21
---

# Welcome to Filemark

A beautiful in-browser viewer for markdown — with big plans for more formats.

<callout type="tip" title="Quick start">

- Drag &amp; drop \`.md\` / \`.mdx\` files anywhere on this window
- Click **Open Folder** (top-right) to load a whole directory
- <kbd>⌘K</kbd> to search across every loaded file

</callout>

## Features you see on this page

- **GitHub-flavored markdown** — tables, task lists, strikethrough, autolinks
- **Syntax highlighting** via Shiki, sharing a theme with the rest of the UI
- **KaTeX math**, inline and block
- **Custom components** — callouts, tabs, collapsible details — via HTML tags
- **Persistent task lists** — checkboxes remember their state per file

## Code

~~~typescript
interface ViewerProps {
  content: string;
  file: FileRef;
  storage?: StorageAdapter;
  assets?: AssetResolver;
}

export function MDXViewer(props: ViewerProps) {
  return <article className="fv-mdx-body">{/* … */}</article>;
}
~~~

## Math

Inline: $E = mc^2$. Block:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$

## Task list — try clicking these

- [x] Ship a monorepo scaffold
- [x] Build the markdown viewer package
- [x] Wire drag &amp; drop
- [x] Persist task checkboxes
- [ ] Add a JSON viewer package (v0.2)
- [ ] Add a code viewer package (v0.2)

## Tables

| Format | Package | Status |
| ------ | ------- | ------ |
| md / mdx | \`@filemark/mdx\` | ✅ v0.1 |
| json | \`@filemark/json\` | v0.2+ |
| code | \`@filemark/code\` | v0.2+ |
| csv | \`@filemark/csv\` | v0.2+ |

## Callouts

<callout type="note">

A plain note. Use these to highlight important context.

</callout>

<callout type="warning" title="Heads up">

Custom HTML components in markdown need **blank lines** around them so the
markdown inside gets re-parsed. This is standard CommonMark behavior.

</callout>

<callout type="danger">

Danger styling for things users shouldn't miss.

</callout>

## Collapsible details

<details summary="Click to expand">

Hidden content goes here. Markdown inside works **with blank lines**.

- Bullet one
- Bullet two

</details>

## Keyboard shortcuts

| Shortcut | Action |
| -------- | ------ |
| <kbd>⌘K</kbd> | Open search palette |
| <kbd>⌘B</kbd> | Toggle sidebar |
| <kbd>[</kbd> | Previous file |
| <kbd>]</kbd> | Next file |
| <kbd>Esc</kbd> | Close palette / panel |

## What's next

The architecture is a monorepo with each viewer as its own package. That means
the same \`@filemark/mdx\` component that renders this doc will drop into a
VS Code webview and a standalone React app unchanged. JSON, code, CSV, and
image viewers are the next packages.

Drop a file to replace this page — or keep exploring.
`;
