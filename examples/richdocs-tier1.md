---
title: Rich docs Tier 1 — full showcase
---

# Rich docs Tier 1 — full showcase

Eight components from M14 — the seven Tier 1 picks plus `<Badge>` + `<Step>` markers. Together they cover **tutorials**, **landing pages**, **dev reference**, and **doc workflow**.

<DocStatus state="approved" owner="aman" updated="2026-04-25"></DocStatus>
<LastUpdated date="2026-04-25" by="aman"></LastUpdated>
<EditThisPage repo="thesatellite-ai/filemark" path="examples/richdocs-tier1.md"></EditThisPage>

---

## 1. Steps — numbered guided walkthrough

<Steps>

<Step title="Install">

Drop the extension folder into `chrome://extensions` (Developer mode).

```bash
git clone git@github.com:thesatellite-ai/filemark.git
cd filemark
pnpm install
pnpm --filter chrome-ext build
```

</Step>

<Step title="Allow file:// access">

Open the extension's details page → toggle **Allow access to file URLs**.

</Step>

<Step title="Open any .md file">

Visit `file:///path/to/notes.md` in Chrome — filemark intercepts and renders.

</Step>

<Step title="Drop a folder">

Drag a folder onto the toolbar icon page — every supported file lands in the library.

</Step>

</Steps>

---

## 2. Cards — landing-page tile grid

Different from `<DocBlock>` (single full-width section). `<DocCard>` is a tile in a responsive grid.

<Cards cols="3">

<DocCard icon="📦" title="Install" href="#1-steps--numbered-guided-walkthrough" badge="5 min">
Four steps from clone to first render.
</DocCard>

<DocCard icon="🚀" title="Quick start" href="#3-glossary--single-doc-auto-link" badge="30 sec">
Open any local markdown file — filemark renders automatically.
</DocCard>

<DocCard icon="🧠" title="The skill" href="https://github.com/thesatellite-ai/filemark/blob/main/skills/filemark/SKILL.md" badge="for AI">
Teach Claude / Cursor / Codex the syntax in one paste.
</DocCard>

<DocCard icon="📊" title="Datagrid" href="./datagrid-full.md">
Spreadsheet-style interactive tables from CSV.
</DocCard>

<DocCard icon="📈" title="Charts" href="./chart-full.md">
Bar / line / pie / area / scatter / funnel / radar.
</DocCard>

<DocCard icon="🗂️" title="Kanban" href="./kanban-full.md">
CSV-driven board with rich card cell types.
</DocCard>

</Cards>

---

## 3. Glossary — single-doc auto-link

Define a term once with `<Define>`. Every later occurrence in this doc gets a hover popover with the definition.

<Define term="filemark">A Chrome extension that turns any local `.md` file into a beautiful, interactive doc — with persistent task checkboxes, a library shell, and structural components like Datagrid, Chart, Kanban, MindMap, and DocBlock.</Define>

<Define term="MDX">Markdown extended with HTML-style component tags — `<Callout>`, `<Tabs>`, `<Datagrid>`, etc. — that render as React components without any JavaScript evaluation.</Define>

Now anywhere in this doc when filemark or MDX is mentioned, you'll get a hover popover. Try hovering over filemark in this paragraph: filemark is a markdown reader. Same for MDX rendering.

---

## 4. APIEndpoint — REST endpoint reference

<APIEndpoint method="POST" path="/v1/orders" auth="bearer" title="Create an order" base="https://api.example.com">

### Body

```json
{
  "items": [
    { "sku": "ABC-123", "qty": 2 }
  ],
  "currency": "USD"
}
```

### Response 201

```json
{
  "id": "ord_a1b2c3",
  "status": "pending",
  "total": 2400
}
```

### Errors

- **400** — invalid body
- **401** — missing or invalid bearer token
- **402** — payment method required

</APIEndpoint>

<APIEndpoint method="GET" path="/v1/orders/:id" auth="bearer">

Fetch a single order by id.

### Response 200

```json
{ "id": "ord_a1b2c3", "status": "shipped" }
```

</APIEndpoint>

<APIEndpoint method="DELETE" path="/v1/orders/:id" auth="bearer"></APIEndpoint>

---

## 5. VideoEmbed — safe iframe wrapper

Privacy-conscious iframe (uses `youtube-nocookie.com`):

<VideoEmbed src="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="Demo video"></VideoEmbed>

Vimeo:

<VideoEmbed src="https://vimeo.com/76979871" title="Vimeo example"></VideoEmbed>

---

## 6. Diff — before/after code blocks

Side-by-side on wide screens, stacked on mobile. Mark blocks with `before` / `after` meta:

<Diff>

```ts before
const result = items.map((i) => i.foo);
```

```ts after
const result = items.flatMap((i) => i.foo ?? []);
```

</Diff>

Without explicit meta, the first fenced block is `before`, second is `after`:

<Diff>

```bash
npm install filemark
```

```bash
pnpm add filemark
```

</Diff>

---

## 7. Badge — inline tone pill

Drop next to a heading or feature name to call out status / version / scope:

### Datagrid <Badge tone="success">stable</Badge>

### Backlinks <Badge tone="info">new in M9</Badge>

### Voice capture <Badge tone="warn">beta</Badge>

### CodePlayground <Badge tone="muted">deferred</Badge>

### Force-quit <Badge tone="danger">destructive</Badge>

---

## 8. LastUpdated + EditThisPage

Two tiny chips — see them at the top of this doc, or repeat them anywhere:

<LastUpdated date="2026-04-20" by="grace"></LastUpdated>
<EditThisPage repo="thesatellite-ai/filemark" path="examples/richdocs-tier1.md" branch="main"></EditThisPage>

---

## Use cases

| Doc archetype | Reach for |
|---|---|
| Tutorial / how-to | Steps, Diff, Badge for "new" / "deprecated" markers |
| Landing / index page | Cards grid, VideoEmbed, LastUpdated |
| API reference | APIEndpoint, Glossary (Define common terms once) |
| Migration guide | Diff (old syntax / new syntax) |
| Release notes | Badge per version, EditThisPage for community contributions |
