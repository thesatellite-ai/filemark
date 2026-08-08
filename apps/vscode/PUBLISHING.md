# Publishing & releasing — Filemark for VS Code

How to ship this extension. Identity is fixed: extension id **`khanakia.filemark`**, publisher **`khanakia`**, license **Filemark License** (proprietary; see [`LICENSE`](./LICENSE)). Two distribution channels:

- **VS Code Marketplace** — the official store (VS Code, and anything using the MS gallery).
- **Open VSX** — the open registry used by **Cursor / VSCodium / Windsurf** and other non-Microsoft builds.

Publishing tokens are never committed. They load from `apps/vscode/.env` (git-ignored); see [`.env.example`](./.env.example).

## What ships in the `.vsix`

Only the runtime + docs. `.vscodeignore` keeps `dist/**` (host bundle + webview entry + code-split chunks + fonts + css) and `media/icon.png`, `README.md`, `CHANGELOG.md`, `LICENSE`, `package.json` — and drops `src`, `node_modules`, configs, tests, and sourcemaps. Sanity-check any time with `task ls` (or `pnpm dlx @vscode/vsce ls --no-dependencies`).

> The vsce warning *"224 files / 157 JS — you should bundle"* is expected here. Those files are the webview's **code-split chunks** (mermaid diagram types, shiki grammars, katex), loaded on demand in the webview — not host files. The host is a single ~28KB `extension.js`, so activation is instant. Bundling them into one file would undo the lazy-load perf win.

## Each release (the routine)

1. **Bump the version** in `package.json` and add a dated section to [`CHANGELOG.md`](./CHANGELOG.md).
2. **Verify the package** builds and contains the right files:
   ```bash
   cd apps/vscode
   task ls        # inspect .vsix contents
   task package   # runs the build (vscode:prepublish) and writes filemark-<ver>.vsix
   ```
   Expect ~3–4 MB, `dist/**` + icon + docs only — no `src`, no `node_modules`.
3. **Publish to the Marketplace:**
   ```bash
   task publish        # @vscode/vsce publish --no-dependencies -p $VSCE_PAT
   ```
4. **Publish to Open VSX** (Cursor / VSCodium):
   ```bash
   task publish-ovsx   # ovsx create-namespace khanakia (first time) + ovsx publish
   ```
5. **(Optional) GitHub release** with the `.vsix` attached (lets users install without a store):
   ```bash
   task release        # tags vscode-vX.Y.Z, pushes it, gh release --generate-notes
   ```

`task release` derives the version from `package.json`, so it's the same command each time. It needs `gh` authenticated with push access.

### Manual equivalents

```bash
cd apps/vscode
pnpm dlx @vscode/vsce package --no-dependencies              # build the .vsix
pnpm dlx @vscode/vsce publish --no-dependencies -p "$VSCE_PAT"   # Marketplace
pnpm dlx ovsx publish "filemark-$(node -p "require('./package.json').version").vsix" -p "$OVSX_PAT"   # Open VSX
```

Users can install a `.vsix` directly via **Extensions → ⋯ → Install from VSIX…** or `code --install-extension filemark-<ver>.vsix`.

## One-time setup

### VS Code Marketplace (publisher `khanakia`)

1. Ensure the `khanakia` publisher exists at <https://marketplace.visualstudio.com/manage> (must match `publisher` in `package.json`).
2. Create an **Azure DevOps** Personal Access Token, scope **Marketplace → Manage**, at <https://dev.azure.com> (User settings → Personal Access Tokens). A personal Microsoft account creates a free org with no subscription needed.
3. Put it in `apps/vscode/.env` as `VSCE_PAT=…`. Then `task publish`.

### Open VSX (Cursor / VSCodium)

1. Sign in at <https://open-vsx.org> with GitHub → create an access token.
2. Put it in `.env` as `OVSX_PAT=…`. Then `task publish-ovsx` (it creates the `khanakia` namespace on first run).

## Why the commands look the way they do

- **`--no-dependencies` on every `vsce`/`ovsx` call** — the package manager is pnpm (vsce can't walk pnpm's symlinked `node_modules`), and the extension ships **zero** runtime `node_modules`: the host (esbuild) and webview (vite) bundles inline everything into `dist/**`.
- **Icon** — `media/icon.png` (512×512), rendered from the repo's `brand/icon.svg`.
- **First Marketplace publish** can take a few minutes to appear in search.

## Name note

`khanakia.filemark` is unique to this publisher, but an unrelated `billyl320.filemark` ("FileMark") already exists on both registries (plus `nicegyuha.filemarks` and `filemark.filemarker` on the Marketplace). The **displayName** "Filemark — Markdown & Data Preview" sets it apart. If a reviewer ever rejects the bare `name`, the fallback is `filemark-preview` (update `name` in `package.json`, this doc, and the Taskfile).

## CI

`.github/workflows/ci.yml` typechecks, tests, and builds the extension (and the renderer package it depends on) on pull requests and pushes that touch `apps/vscode` or `packages/**`. It does **not** publish — publishing is a deliberate local step with the tokens above.
