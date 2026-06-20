// Embedded welcome document shown on first run / when no file is open. It
// doubles as a live feature showcase AND an implicit smoke test: if rendering
// breaks, this page looks wrong. Keep it current with shipped features.
//
// The version is read from the manifest at load time so it never goes stale
// (the old doc hardcoded "0.1.0" and drifted). `updated` is still manual.

/** Extension version from the manifest, with a safe fallback for non-extension
 *  contexts (localhost dev has no `chrome.runtime`). */
function extVersion(): string {
  try {
    return (
      (typeof chrome !== "undefined" &&
        chrome.runtime?.getManifest?.().version) ||
      "0.1.4"
    );
  } catch {
    return "0.1.4";
  }
}

export const WELCOME_DOC = `---
title: Welcome to Filemark
description: A local-first viewer that renders markdown, JSON, CSV, and SQL/Prisma/DBML schemas in Chrome. Drop a file or open a folder to replace this page.
tags: [markdown, mdx, json, csv, schema, chrome-extension]
version: ${extVersion()}
updated: 2026-06-20
---

# Welcome to Filemark

A local-first viewer that turns files Chrome would otherwise download or show as plain text into rich, interactive views — **100% in your browser, nothing uploaded.**

<callout type="tip" title="Quick start">

- Drag &amp; drop \`.md\` / \`.json\` / \`.csv\` / \`.sql\` files anywhere on this window
- Click **Open Folder** (top-right) to load a whole directory
- <kbd>⌘K</kbd> to search across every loaded file
- Click the **rocket** (top-right) to finish setup — enable rendering of local \`file://\` files and remote URLs

</callout>

<callout type="warning" title="One-time setup to render local files">

To open local files by double-clicking them in Finder/Explorer, visit \`chrome://extensions\`, open Filemark's **Details**, and turn on **"Allow access to file URLs."** The rocket button walks you through it. Until then, drag-drop and Open Folder still work.

</callout>

## What it opens

| Format | Viewer | What you get |
| ------ | ------ | ------------ |
| \`.md\` · \`.mdx\` | \`@filemark/mdx\` | Full GFM + interactive components |
| \`.json\` · \`.jsonc\` | \`@filemark/json\` | Collapsible tree, 9 themes, copy on any node |
| \`.csv\` · \`.tsv\` | \`@filemark/csv\` | Sortable, filterable datagrid |
| \`.sql\` · \`.prisma\` · \`.dbml\` | \`@filemark/schema\` | Interactive ER diagram |

## Markdown features on this page

- **GitHub-flavored markdown** — tables, task lists, strikethrough, autolinks, footnotes
- **Syntax highlighting** via Shiki, sharing a theme with the rest of the UI
- **KaTeX math**, inline and block
- **Emoji shortcodes** — \`:rocket:\` → :rocket:, \`:tada:\` → :tada:
- **Interactive components** — callouts, tabs, details, stats, ADRs, datagrids, kanban boards, charts, mindmaps, ER diagrams
- **Markdown-native tasks** — checkboxes persist per file; group into boards and timelines

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

## A datagrid from CSV

\`\`\`csv type:status=status type:owner=avatar title="Try sorting / filtering"
name,status,owner,score
Parser,done,Ada,5
Viewer,wip,Grace,4
Docs,todo,Linus,3
\`\`\`

## Task list — try clicking these

- [x] Ship the markdown viewer
- [x] Ship JSON / CSV / schema viewers
- [x] Per-site activation rules
- [x] Emoji + math rendering
- [ ] Your turn — drop a file to replace this page

## Callouts

<callout type="note">

A plain note. Use these to highlight important context.

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

## Links

- **Website + live demo** — https://khanakia.com/apps/filemark/
- **Report an issue / support** — https://github.com/thesatellite-ai/filemark/issues

Drop a file to replace this page — or keep exploring.
`;
