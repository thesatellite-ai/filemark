# Architecture — Filemark for VS Code

How the extension is put together, and the invariants a contributor must not break. For setup/dev-loop see [`../CONTRIBUTING.md`](../CONTRIBUTING.md); for release see [`../PUBLISHING.md`](../PUBLISHING.md).

## The big picture

The extension is a **host shell**. All rich rendering is the shared, host-agnostic `@filemark/*` packages (`@filemark/mdx`, `@filemark/core`, `@filemark/tasks`, …) — the exact same code the Chrome extension and the website use. This app only provides the VS Code-specific *host*: a webview to render into, adapters for storage/assets/navigation, and the editor integrations.

There are **two runtimes**, and keeping them separate is the central design rule:

```
┌─ Extension Host (Node, CJS) ─────────────┐        ┌─ Webview (browser iframe, ESM) ─────────┐
│ src/extension.ts                         │  post  │ src/webview/App.tsx                       │
│  • commands, WebviewPanels               │ ─────► │  • MDXViewer / GithubMarkdown (React)    │
│  • WorkspaceEdit (task write-back)       │ Message│  • toolbar (mode toggle + zoom)          │
│  • globalState (view mode, zoom, scroll) │ ◄───── │  • scrollSync (DOM), scrollMath (pure)  │
│  • features/* (outline/folding/…/tree)   │        │  • adapters (storage, assets)           │
└──────────────────────────────────────────┘        └──────────────────────────────────────────┘
                     ▲                                                   ▲
                     └──────────── src/shared/** (plain TS) ────────────┘
                          messages.ts (protocol) + constants.ts (zoom)
```

- **Host** runs in Node. It can use `vscode` and `node:*`. It must **not** import React or DOM.
- **Webview** runs in a sandboxed browser iframe. It can use React/DOM. It must **not** import `vscode` (only `acquireVsCodeApi()` via `src/webview/vscodeApi.ts`) or `node:*`.
- **`src/shared/**`** is the only code both import. It's plain TS — no host, no DOM, no React. This is why the message protocol and zoom constants live there.

## Why a webview (not a CustomTextEditor)?

Rich, interactive React UI (mermaid, charts, kanban, task views) can only run in a webview — that's how Jupyter, the SQLite editor, etc. work too. The raw text editor stays VS Code's **native** editor (ADR VSC-1); the preview is a separate `WebviewPanel`. This gives real editing (multi-cursor, extensions, LSP) for free and keeps the extension small.

## Host ↔ webview protocol

All traffic is `postMessage` JSON, typed in `src/shared/messages.ts`. `MSG` is the single closed set of type tags; every message has a typed interface and belongs to `HostToWebview` or `WebviewToHost`.

| Direction | Message | Purpose |
|---|---|---|
| host → webview | `update` | (Re)render: text, fileName, ext, docBaseUri, config (theme/font/zoom/viewMode/scrollSync). Sent on open, on edit (debounced), and on any setting/mode/zoom change. |
| host → webview | `syncScroll` | Scroll the preview to a source line (editor scrolled). |
| host → webview | `restoreScroll` | Restore a saved scroll position on (re)open. |
| webview → host | `ready` | React mounted; host replies with `update` (+ `restoreScroll` if remembered). |
| webview → host | `navigate` | A link/relative path was clicked; host opens it. |
| webview → host | `scrolled` | Preview's top source line changed; host mirrors the editor + remembers it. |
| webview → host | `revealSource` | Double-click jump; host moves the editor cursor + focuses. |
| webview → host | `setViewMode` / `setZoom` | Toolbar toggles; host persists in globalState + re-posts. |
| webview → host | `toggleTask` | A task checkbox was clicked; host applies a `WorkspaceEdit`. |

## Scroll sync (the subtle part)

Line-anchored, using the `data-line` attributes that `@filemark/mdx`'s `remarkSourceLine` stamps on every block. Two coordinate gotchas, both handled:

1. **Frontmatter offset.** `data-line` is numbered from the *post-frontmatter body* (MDXViewer strips `---…---` before parsing), but the editor counts whole-file lines. The webview adds `frontmatterLineOffset(text)` (exported from `@filemark/mdx`) to translate. Without this, sync is off by the frontmatter's length.
2. **The scroll container isn't `window`.** The VS Code webview scrolls an *inner* element. `scrollSync.ts` resolves the real scroller and measures everything in its coordinates; the scroll listener uses **capture phase** so it fires for the inner scroller (scroll events don't bubble).

`scrollSync.ts` owns the DOM (collect anchors, resolve scroller, listeners, feedback-loop guards, the resync settle loop). `scrollMath.ts` is the **pure** interpolation (`topForLine` / `lineAtY`) — no DOM, unit tested. Feedback loops are prevented on both ends (a `programmatic` flag webview-side; a per-URI suppress window host-side).

GitHub mode also gets `data-line` anchors (we added `remarkSourceLine` to `GithubMarkdown` and allow `data-line` through its `rehype-sanitize` schema), so sync/jump work in both render modes.

## Interactive task write-back

Clicking a task checkbox in the preview edits the **source file** (file stays the source of truth). The webview intercepts the checkbox click in capture phase, `preventDefault`s it (so it doesn't toggle locally), and posts `toggleTask` with the whole-file line. The host runs the pure `toggleTaskMarker` (in `features/taskToggle.ts`) to compute the marker column + replacement char, then applies a `WorkspaceEdit`. The edit re-renders the preview via the normal debounced `update`.

## Runtime state

- **Appearance** (theme/font/size/line-height/width/customCss) → VS Code **settings** (`filemark.*`), applied live via `ThemeProvider`.
- **View mode / zoom** → **globalState** (runtime toggles, not settings), persisted across sessions.
- **Scroll position** → **globalState**, per document URI, debounced and flushed on close.

## Build pipeline

- **Host:** `esbuild src/extension.ts --bundle --platform=node --format=cjs --external:vscode` → `dist/extension.js` (single ~28KB file → instant activation).
- **Webview:** `vite build` → `dist/webview/main.js` + `main.css` + **code-split chunks**. Heavy libs (mermaid, shiki language grammars, katex) are dynamically imported and load on demand; a plain doc pays only for the small entry bundle (~1.3MB vs 10.4MB inlined).
  - Chunks resolve via relative ESM specifiers against `import.meta.url` (the per-session webview URI), so no build-time base is needed. The CSP allows this with `script-src 'nonce-…' 'strict-dynamic'`.
- Both are produced by `pnpm --filter filemark build`, which `vscode:prepublish` runs before packaging.

## Invariants (don't break these)

- Host imports no React/DOM; webview imports no `vscode`/`node:*`; shared code is plain TS.
- `data-line` sync math must account for the frontmatter offset **and** the non-`window` scroller.
- Task write-back edits only the marker char (via `toggleTaskMarker`) — never re-serialize the line.
- The webview's `dist/**` chunks must ship in the `.vsix` (they're the runtime) — only sourcemaps are excluded.
- New pure logic gets a unit test; rendering changes go in `packages/*`, not here.
