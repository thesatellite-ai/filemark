---
title: Filemark — Chrome Web Store listing (final copy)
owner: aman
status: ready
---

# CWS dev-console fields — final, locked

Copy-paste these straight into the [Chrome Web Store dev console](https://chrome.google.com/webstore/devconsole) at submission time. Every field is under its hard limit; the count after each title is the final length.

> The architecture / decision rationale lives in [`CWS_PUBLISH_PLAN.md`](./CWS_PUBLISH_PLAN.md). The mechanical publishing runbook (OAuth, refresh token, `task release`) is in [`PUBLISHING.md`](./PUBLISHING.md). This doc is purely the **listing copy** ready to ship.

<DocStatus state="approved" owner="aman" updated="2026-06-14"></DocStatus>

<Stats cols="4">
  <Stat title="Required fields" value="11" description="all drafted final" />
  <Stat title="Permission justifications" value="4" description="each ≤1000 chars" />
  <Stat title="Privacy URL" value="✓" description="khanakia.com/apps/filemark/privacy" />
  <Stat title="Submission blockers" value="2" description="assets + CWS account" />
</Stats>

## Account-level settings

| Field | Value |
|---|---|
| **Category** | Developer Tools |
| **Language** | English (US) |
| **Visibility** | Public |
| **Regions** | All regions |
| **Mature content** | No |
| **Support email** | `khanakia@gmail.com` |
| **Homepage URL** | `https://khanakia.com/apps/filemark/` |
| **Privacy policy URL** | `https://khanakia.com/apps/filemark/privacy` |

## 1. Title (≤45 chars) — 45/45 ✓

```text
Filemark — Markdown, JSON, CSV, schema viewer
```

> Mentions 4 of the top file types in 45 chars. Reviewers + search benefit.

## 2. Summary / short description (≤132 chars) — 121/132 ✓

```text
Open .md, .mdx, .json, .csv, .sql, .prisma, .dbml in Chrome — real renderers, tabs, search, themes, kanban from markdown.
```

> All 7 visible file types + 5 product nouns. No fluff.

## 3. Single-purpose description (≤1000 chars) — 829/1000 ✓

```text
Filemark's single purpose is to render local files that Chrome would otherwise download or display as plain text. It opens .md, .mdx, .json, .jsonc, .csv, .tsv, .sql, .prisma, and .dbml files inside Chrome and renders each format with a real, interactive viewer: full GitHub-flavored markdown with KaTeX, Mermaid, callouts, tabs, and inline kanban boards; JSON as a collapsible tree with nine themes; CSV and TSV as a sortable, filterable datagrid; SQL, Prisma, and DBML as an interactive entity-relationship diagram. Every renderer runs entirely in your browser — no file contents, search queries, settings, or telemetry of any kind are sent to any server. Filemark does not do anything outside that purpose: no analytics, no remote code execution, no integration with external services, no modification of any web page, no observation of your browsing behavior.
```

## 4. Permission justifications

CWS requires one per requested permission. Each ≤1000 chars.

### 4.1 `storage` — 705/1000 ✓

```text
Required to persist user preferences (theme, font family, font size, line height, content width), the local file library (recently opened files, open tabs, folder handles you have granted), per-file UI state (task-checkbox state, datagrid sort and filter choices, scroll position, sidebar collapse state), and extension settings (which file formats are enabled, JSON-viewer options, keyboard-shortcut bindings, sidebar width). All data is stored locally using the browser's IndexedDB and chrome.storage APIs and never leaves the device. Without this permission, every preference, open tab, and per-file state would be lost on browser restart. We do not write any personally identifiable information to storage.
```

### 4.2 `declarativeNetRequest` — 740/1000 ✓

```text
Required to register dynamic redirect rules that intercept navigations to local .csv and .tsv files. Without this permission, Chrome triggers a file download when you navigate to a local CSV. With it, Filemark redirects the navigation to its built-in datagrid renderer so the file opens inside the extension instead. The declarativeNetRequest API is a declarative rule system — Filemark cannot observe, log, intercept, or modify any other network traffic itself. Rules are scoped to local file:// URLs only and are created at runtime, and only when the relevant file formats (.csv, .tsv) are enabled in extension settings. Users can disable any format individually in the options page to remove the corresponding rule.
```

### 4.3 `host_permissions: <all_urls>` — 832/1000 ✓

```text
Required by Chrome's Manifest V3 platform to register declarativeNetRequest redirect rules whose redirect target is a chrome-extension:// URL inside the extension. This is a platform constraint of MV3 dynamic redirects, not a data-collection mechanism. Filemark does NOT read, scrape, log, modify, or transmit the content of any web page you visit. It does NOT inject scripts into the pages you browse. It does NOT observe cross-site browsing behavior. The Manifest V3 Content Security Policy is strict (no unsafe-eval), so no remote code is fetched or executed at runtime — every rendering library is bundled into the extension at build time. You can verify this in Chrome DevTools' Network tab: Filemark issues zero outbound network requests during normal use, only the per-tab reads of the local files you ask it to open.
```

### 4.4 Content script on `file:///*` (the "Allow access to file URLs" toggle) — 706/1000 ✓

```text
The content script registered for file:///* lets Filemark take over when you navigate to a local file (e.g., you double-click notes.md in Finder and Chrome opens file:///path/to/notes.md). Without this script, Filemark cannot render the file in place — Chrome would only show the raw text. The script reads only the bytes of the file you have actively navigated to, hands them to the extension's viewer page, and runs no other code on the page. You enable this behavior yourself by toggling "Allow access to file URLs" on the extension's details page in chrome://extensions; without that opt-in, the extension cannot read any local file. The script does not request or transmit any data.
```

## 5. Detailed description (long-form, plain text + emoji)

CWS allows ~16,000 chars; this draft is ~2,200. Plain text only — newlines preserved, no markdown.

```text
Open every file Chrome can't already render — beautifully.

📂 WHAT IT OPENS
Markdown (.md, .mdx), JSON (.json, .jsonc), CSV/TSV (.csv, .tsv), and SQL/Prisma/DBML schemas (.sql, .prisma, .dbml). Nine formats, one extension.

✨ REAL RENDERERS, NOT PREVIEWS

• Real GitHub-flavored markdown — tables, task lists, footnotes, autolinks, KaTeX math, Mermaid diagrams, syntax highlighting via shiki — plus inline components: callouts, tabs, ADRs, kanban boards, charts.

• SQL → ER diagram — drop a .sql, .prisma, or .dbml file and get an interactive entity-relationship diagram with foreign keys. Falls back to syntax-highlighted source if the parser stumbles.

• JSON viewer — collapsible tree, nine themes (githubDark, nord, monokai, gruvbox, vscode, basic, dark, light, githubLight), copy-to-clipboard on every node, line-numbered parse errors. Better than DevTools, in the file viewer.

• CSV / TSV datagrid — sortable, filterable, resizable. Type-aware columns (status badges, tag chips, ratings, currency, dates) via simple fence-meta hints. CSV / Markdown / JSON export.

• Tasks → Kanban — author tasks as ordinary markdown bullets with @owner, !priority, ~due, (project) sigils. Drop one <Kanban md/> tag and the same file renders as a board, grouped however you want.

🔒 100% CLIENT-SIDE
No server. No upload. No analytics. No telemetry. No remote code execution. Your files are read locally and never leave the browser. Verify it yourself in Chrome DevTools — Filemark issues zero outbound requests during normal use.

🚀 FAST ON BIG FOLDERS
Lazy shiki loading, code-split language grammars, IndexedDB-backed persistence. Open thousands of files without bog.

📁 DRAG A FOLDER, BECOME A PROJECT
Recursive walk skips noise dirs (node_modules, .git, dist, build). File-tree sidebar, draggable tabs, full-text search across files via ⌘K palette, per-file scroll memory.

🎨 THREE THEMES + TYPOGRAPHY CONTROLS
Light / dark / sepia, with font family (sans / serif / mono), font size, line height, and content-width sliders — each individually resettable.

🛠️ OPEN SOURCE (MIT)
Full source code at https://github.com/thesatellite-ai/filemark — including the manifest with every permission declared. Audit the network behavior in DevTools yourself.

💡 TIP — TO RENDER LOCAL FILES
After installing, visit chrome://extensions, click Details on Filemark, and toggle "Allow access to file URLs." This lets Filemark take over when you navigate to a local file. Without it, you can still drag files in or use the Open Folder button.

🌐 LIVE DEMO + LANDING
https://khanakia.com/apps/filemark/

📧 SUPPORT
khanakia@gmail.com
```

## 6. Data handling declaration

CWS asks a series of checkboxes. The truthful answer for every data-collection category:

| Category | Collected? |
|---|---|
| Personally identifiable information | No |
| Health information | No |
| Financial / payment information | No |
| Authentication information | No |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity (clicks, scrolls, etc.) | No |
| Website content | No |

Plus the three required certifications:

- ✅ I certify that the data collected by this item is **not being sold** to a third party, outside of the approved use cases.
- ✅ I certify that the data collected by this item is **not being used or transferred for purposes unrelated** to the item's single purpose.
- ✅ I certify that the data collected by this item is **not being used or transferred to determine creditworthiness** or for lending purposes.

(All three trivially true because Filemark collects no data at all — see Privacy Policy section 2.)

## 7. Submission checklist (gate before clicking Submit)

- [ ] CWS developer account active (one-time .00)
- [ ] OAuth client + refresh token captured in `.env` (`CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`) — see [`PUBLISHING.md`](./PUBLISHING.md) §1.1–1.5
- [ ] `task release -- 0.1.0` produced a valid zip under `apps/chrome-ext/`
- [ ] At least 1 screenshot at 1280×800 (CWS minimum — 5 recommended) — see Phase C of [`CWS_PUBLISH_PLAN.md`](./CWS_PUBLISH_PLAN.md#phase-c-—-assets)
- [ ] 440×280 small promo tile uploaded
- [ ] Title / Summary / Single-purpose / 4× permission justifications pasted (above)
- [ ] Privacy policy URL points at the live `/privacy` page (verify 200)
- [ ] Support email + homepage URL set (above)
- [ ] Category = Developer Tools
- [ ] Data handling declaration completed (all "No" + 3 certifications)
- [ ] Detailed description pasted
- [ ] Trademark sanity check on "Filemark" done

When every line above is ✓, click **Submit for review** in the CWS dev console. Review typically takes 1–7 days.
