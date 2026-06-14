# Chrome Web Store assets

Everything that gets uploaded into the [CWS dev console](https://chrome.google.com/webstore/devconsole) at submission time, plus the scripts that regenerate it.

## Contents

| File | Purpose | Dims | CWS field |
|---|---|---|---|
| `LISTING.md` | Final copy for every text field (title, summary, single-purpose, 4× permission justifications, detailed description, data declaration) | — | text fields |
| `screenshots/1-hero.png` | MDX doc — callout, task chips, format coverage table | 1280×800 | screenshot 1 |
| `screenshots/2-schema.png` | SQL → interactive ER diagram, 5 tables / 4 relations | 1280×800 | screenshot 2 |
| `screenshots/3-json.png` | JSON viewer — collapsible tree, githubDark theme | 1280×800 | screenshot 3 |
| `screenshots/4-datagrid.png` | CSV datagrid — sortable, filterable, type-aware columns | 1280×800 | screenshot 4 |
| `screenshots/5-tasks-kanban.png` | Markdown tasks with `@owner` / `!priority` / `~due` sigils | 1280×800 | screenshot 5 |
| `promo-tile.png` | Small promo tile — Filemark wordmark + tagline + 5 format chips | 440×280 | small promo tile |

## Regenerate

```bash
# from repo root, once if packages changed:
task build:packages
pnpm --filter chrome-ext build

# then from this dir:
cd apps/chrome-ext/cws-assets/scripts
ELECTRON=../../../desktop/node_modules/.bin/electron   # any electron in the workspace

# 5 screenshots
$ELECTRON shot.cjs --doc=1-hero.md
$ELECTRON shot.cjs --doc=2-schema.sql       --filename=schema.sql       --out=2-schema
$ELECTRON shot.cjs --doc=3-package.json     --filename=package.json     --out=3-json
$ELECTRON shot.cjs --doc=4-datagrid.csv     --filename=roadmap.csv      --out=4-datagrid
$ELECTRON shot.cjs --doc=5-tasks-kanban.md  --filename=launch-board.md  --out=5-tasks-kanban

# promo tile
$ELECTRON promo-shot.cjs
```

## How it works (briefly)

`shot.cjs` runs an Electron `BrowserWindow` in **offscreen mode** (no display required), loads `apps/chrome-ext/dist/src/app/index.html` from disk, and preloads `shim-chrome.cjs` which stubs the `chrome.*` API surface so the extension's React app boots without crashing. The sample doc is injected via the extension's own `#fv-inline=<base64>` intercept format (see [`apps/chrome-ext/src/app/intercept.ts`](../src/app/intercept.ts)) — no real `chrome.storage.session` round trip needed. After 8 seconds (enough for React mount + viewer dynamic imports + shiki + the schema parser to load + paint), `webContents.capturePage()` writes a 1280×800 PNG.

`promo-shot.cjs` is simpler: it offscreen-renders `promo-tile.html` at 440×280 and writes the PNG. The HTML is self-contained — same shadcn aesthetic as the marketing site.

## Why not Playwright with `--load-extension`?

We went with Electron offscreen because:

- This sandbox has **no display** (can't run a headed Chromium with the extension loaded).
- Playwright + `--headless=new` + extensions works on newer Chromium, but the install + browser-download added more friction than the shim approach.
- The visual output is pixel-identical to the actual chrome-ext UI — the shim only fakes the `chrome.*` runtime APIs (storage/runtime/declarativeNetRequest), not the rendering layer.

If you want truly authentic browser-extension captures (e.g. for App Store submissions where they reject mocks), swap `shot.cjs` for a Playwright script: `chromium.launchPersistentContext(userDataDir, { headless: 'new', args: ['--disable-extensions-except=' + extPath, '--load-extension=' + extPath] })`. Same `#fv-inline=` URL injection works.

## CWS dimensions reference

- **Screenshots:** 1280×800 (preferred) or 640×400. At least 1 required, up to 5 allowed.
- **Small promo tile:** 440×280, PNG or JPEG, **required**.
- **Marquee promo tile:** 1400×560, optional (needed for store-featuring eligibility).
- **Icon (manifest):** 128×128 — already in [`../public/icons/icon-128.png`](../public/icons/icon-128.png).
