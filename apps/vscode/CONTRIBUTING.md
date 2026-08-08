# Contributing to Filemark for VS Code

This is the VS Code host for [filemark](https://khanakia.com/apps/filemark/) — it lives in the filemark monorepo at `apps/vscode` and reuses the shared `@filemark/*` renderer packages. The extension is a thin host shell; almost all rendering logic lives in `packages/*`, not here.

- **Architecture:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — read this before changing anything non-trivial.
- **Publishing / releasing:** [`PUBLISHING.md`](./PUBLISHING.md).
- **User-facing docs:** [`README.md`](./README.md).

## Prerequisites

- **Node** ≥ 20 and **pnpm** (the monorepo package manager — `corepack enable` or install pnpm globally).
- **VS Code** ≥ 1.90 (the extension's `engines.vscode`).
- Optional: [`task`](https://taskfile.dev) (Taskfile) for the packaging/publishing shortcuts in `Taskfile.yml`.

## First-time setup

Install the whole workspace from the repo root (the extension depends on sibling packages):

```bash
# from the filemark repo root
pnpm install
pnpm --filter filemark build   # builds host (esbuild) + webview (vite) into apps/vscode/dist
```

> The workspace package name is **`filemark`** (it's the published extension name). So it's `pnpm --filter filemark …`, not `@filemark/vscode`.

## Running it (Extension Development Host)

1. Open **`apps/vscode`** in VS Code.
2. **Run and Debug → "Run Filemark Extension"** (or F5). This launches an Extension Development Host with the extension loaded and opens the `examples/` folder.
3. Open any `.md` and trigger the preview (`Cmd/Ctrl+Shift+V`, or the split icon / `Cmd/Ctrl+Alt+V`).

### Fast iteration loop

VS Code **cannot hot-reload extension code**, so after a change you reload the dev host. Run the watcher once so you never rebuild by hand:

```bash
pnpm --filter filemark dev    # concurrently: vite --watch (webview) + esbuild --watch (host)
```

Then apply changes in the running dev host:

- **Host / manifest changes** (commands, settings, views, `src/extension.ts`) → `Cmd/Ctrl+R` (Reload Window).
- **Webview changes** (`src/webview/**`, styles) → reopen the preview tab, or `Cmd/Ctrl+R`.

So the loop is: **edit → (auto-rebuild) → `Cmd+R`**.

## Code layout

```
apps/vscode/
  src/
    extension.ts            Host entry: commands, webview panels, WorkspaceEdit,
                            scroll-sync host side, globalState (view mode / zoom / scroll memory)
    shared/                 Types + constants shared by host AND webview
      messages.ts           The host<->webview postMessage protocol (MSG + typed messages)
      constants.ts          Zoom bounds + clampZoom (single source for both sides)
    features/               Native-editor language features (run on the raw .md)
      symbols.ts            Outline / breadcrumbs / Go-to-Symbol
      folding.ts            Section / fence / frontmatter folding
      links.ts              [[wikilink]] document links
      statusBar.ts          Reading time / words / task progress
      markdown.ts           Shared parse helpers (headings, word count, tasks)
      taskTree.ts           Cross-file task TreeView (uses @filemark/tasks/pure)
      taskToggle.ts         Pure task-checkbox toggle logic (unit tested)
    webview/                The preview UI (React), bundled by vite
      main.tsx              React root
      App.tsx               Renders MDXViewer / GithubMarkdown; toolbar; wires everything
      scrollSync.ts         DOM side of scroll sync (scroller resolution, listeners)
      scrollMath.ts         Pure line<->offset interpolation (unit tested)
      vscodeApi.ts          acquireVsCodeApi() singleton
      adapters/             ViewerProps adapters (storage via webview state, assets via asWebviewUri)
      styles.css            Tailwind + shadcn tokens + @filemark/mdx styles + github.css
  media/icon.png            Marketplace icon
  dist/                     Build output (gitignored) — extension.js + webview/**
```

## The two build targets

- **Host** (`src/extension.ts` → `dist/extension.js`) — esbuild, CJS, `vscode` external, Node runtime. Runs in VS Code's extension host.
- **Webview** (`src/webview/**` → `dist/webview/**`) — vite, ESM, browser runtime, code-split (heavy libs load on demand). Runs in a sandboxed iframe.

They share only `src/shared/**` (plain TS, no host or DOM deps). See `docs/ARCHITECTURE.md` for the boundary rules.

## Testing & checks

Everything must be green before a PR:

```bash
pnpm --filter filemark typecheck   # tsc for host + webview
pnpm --filter filemark test        # vitest — pure logic (taskToggle, scrollMath, clampZoom)
pnpm --filter filemark build       # both bundles compile
pnpm --filter @filemark/mdx test   # renderer helpers this extension relies on
```

Pure logic (parsing, math, interpolation) is unit-tested; host/webview wiring is verified by typecheck + build; runtime behavior (webview CSP, mermaid, images) is verified by hand in the dev host (F5). New pure logic should come with a test.

## Conventions

- **Type safety:** no `any` / `as any` / `@ts-ignore`. Boundary casts must be justified in a comment.
- **Host vs webview:** never import `vscode` from the webview, and never import DOM/React from the host. Anything shared goes through `src/shared/**` as plain TS. Keep React out of the host bundle (that's why the task tree imports `@filemark/tasks/pure`).
- **Constants over literals:** closed-set values (message types, zoom bounds, keys) live in named constants — see `shared/messages.ts` and `shared/constants.ts`.
- **Styling:** Tailwind utilities + shadcn tokens (`bg-muted`, `text-foreground`, …); dark mode via `[data-theme]`. No hardcoded hex.
- **Renderer changes** belong in `packages/*` (they benefit the Chrome extension + website too), not here.

## Submitting a change

1. Branch from `main`.
2. Make the change; add/adjust tests for any new pure logic.
3. Run the four checks above — all green.
4. Update `README.md` (user-facing) and/or `docs/ARCHITECTURE.md` (internals) if behavior or structure changed, and add a `CHANGELOG.md` entry under a new version heading.
5. Open a PR against `main`.
