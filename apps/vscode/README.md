# Filemark for VS Code

Rich Markdown preview inside VS Code, powered by [filemark](https://khanakia.com/apps/filemark/) — the same renderer as the Chrome extension and web playground (callouts, charts, kanban, tasks, mermaid, math, and more). Your text editor stays the native raw view; a filemark **Preview** opens beside it, and the two scroll together.

The preview reuses the host-agnostic `@filemark/*` packages unchanged — this extension is only the VS Code host shell (a webview plus `ViewerProps` adapters for storage, assets, and navigation).

## Features

- **Live preview** — the rendered view updates as you type (debounced), while the raw text editor stays native.
- **Open to the side** — split raw + preview so they're visible at once (`Cmd/Ctrl+Alt+V`, or the split icon in the editor title). `Cmd/Ctrl+Shift+V` opens it in the same pane instead.
- **Two-way scroll sync** — scroll the editor and the preview follows; scroll the preview and the editor follows. Line-anchored (via source-line stamps), so it tracks the block you're actually on.
- **Double-click to jump** — double-click any block in the preview to move the editor's cursor to that block's source line.
- **Remembers your place** — the preview restores its scroll position per file when you reopen it.
- **Zoom** — `Cmd/Ctrl` `+` / `-` / `0`, or the zoom controls in the preview toolbar (persists across files).
- **GitHub preview mode** — flip the preview between the full filemark render and a GitHub-flavored approximation ("how it looks pushed to GitHub") via the toolbar toggle or **Filemark: Toggle GitHub Preview**. Scroll sync and jump-to-source work in both modes.
- **Interactive tasks** — click a task checkbox in the preview and it edits the source file (`- [ ]` ↔ `- [x]`).
- **Open in browser** — open the current file as `file://…` in Chrome (where the filemark Chrome extension renders it) via the globe icon or **Filemark: Open in Browser**.
- **Workspace task tree** — a Filemark view in the activity bar listing every task across the workspace's Markdown files, grouped by file; click a task to jump to it. Refreshes as files change.
- **Native editor integration** (on the raw `.md`): Outline / breadcrumbs / Go-to-Symbol from headings, section + fence + frontmatter folding, `[[wikilink]]` navigation, and a status-bar reading-time / word-count / task-progress readout.
- **Find in preview** — `Cmd/Ctrl+F` searches the rendered content.
- **Appearance** — theme, font family, font size, line height, content width, and custom CSS, all via VS Code settings (below), applied live.

## Commands

| Command | Default keybinding | What it does |
|---|---|---|
| Filemark: Open Preview | `Cmd/Ctrl+Shift+V` | Open the preview in the same pane (tab). |
| Filemark: Open Preview to the Side | `Cmd/Ctrl+Alt+V` | Open the preview split beside the editor. |
| Filemark: Toggle GitHub Preview | — | Switch all previews between Filemark and GitHub render. |
| Filemark: Open in Browser | — | Open the current `.md` as `file://…` in Chrome. |
| Filemark: Refresh Tasks | — | Rescan the workspace for the task tree (also in the view's title bar). |

## Settings

| Setting | Default | Description |
|---|---|---|
| `filemark.autoOpenPreview` | `false` | Open the preview automatically when a Markdown file opens. |
| `filemark.scrollSync` | `true` | Keep editor and preview scroll positions in sync (both directions). |
| `filemark.theme` | `auto` | Preview theme: `auto` (follows VS Code), `light`, `dark`, `sepia`. |
| `filemark.fontFamily` | `sans` | Preview body font: `sans`, `serif`, `mono`. |
| `filemark.fontSize` | `14` | Preview body font size (px). |
| `filemark.lineHeight` | `1.65` | Preview body line height. |
| `filemark.contentWidth` | `760` | Max content column width (px). |
| `filemark.customCss` | `""` | Custom CSS injected into the preview. |

## Develop

```bash
pnpm install
pnpm --filter @filemark/vscode build
```

Open `apps/vscode` in VS Code and start the extension: **Run and Debug → "Run Filemark Extension"** (or F5 if that key isn't taken by macOS). This launches an Extension Development Host with the extension loaded; open any `.md` to see the preview.

### Fast iteration loop

VS Code **cannot hot-reload extension code** — every extension dev reloads the dev host after a change. Run the watcher once so you never rebuild by hand:

```bash
pnpm --filter @filemark/vscode dev   # or: Terminal → Run Task → "watch"
```

It rebuilds the host + webview on every save. To apply a change in the running Extension Development Host:

- **Host / manifest changes** (commands, settings, views, `extension.ts`) → `Cmd/Ctrl+R` (Reload Window) in the dev host.
- **Webview changes** (`App.tsx` / styles) → reopen the preview tab, or `Cmd/Ctrl+R`.

So the loop is: edit → (auto-rebuild) → `Cmd+R`.

### Testing

Pure logic (frontmatter offset, math-fence normalization, task toggle, scroll interpolation, zoom clamp) has unit tests:

```bash
pnpm --filter @filemark/vscode test    # host/webview pure logic
pnpm --filter @filemark/mdx test       # renderer helpers
```

Host and webview wiring is verified by `pnpm --filter @filemark/vscode typecheck` plus the build; runtime behavior (webview CSP, mermaid, images) is verified by hand in the dev host.

## Build outputs

- `dist/extension.js` — extension host (esbuild, CJS, `vscode` external).
- `dist/webview/main.js` + `main.css` — the preview webview entry. Heavy libraries (mermaid, shiki language grammars, katex) are **code-split** into sibling chunks loaded on demand, so a plain document loads only the small entry bundle. The host loads it via `asWebviewUri` under a strict CSP (`script-src 'nonce-…' 'strict-dynamic'`, which lets the nonce'd entry pull its chunks).

## Status

Feature-complete for Markdown. Not yet published to the Marketplace. See `docsi/VSCODE_EXTENSION_PLAN.md` for the roadmap (Marketplace publishing; additional file formats are intentionally out of scope for now).
