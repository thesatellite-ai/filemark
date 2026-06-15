---
title: Rich docs Tier 3 — full showcase
---

# Rich docs Tier 3 — full showcase

Twelve M16 components — GitHub artifact cards, FileTree, EnvVarsTable, Lightbox, Carousel, Gauge, Treemap, Quiz, Poll, AISummary, CalloutWithAction, AuthorCard, PackageBadge.

<DocStatus state="approved" owner="aman" updated="2026-04-25"></DocStatus>

---

## 1. PR / Issue / Commit cards

<PRCard repo="thesatellite-ai/filemark" number="42" state="merged" title="Add MindMap component (markmap engine)" author="aman"></PRCard>

<IssueCard repo="thesatellite-ai/filemark" number="13" state="open" title="MindMap fullscreen exit doesn't refit on second toggle" author="grace"></IssueCard>

<CommitCard repo="thesatellite-ai/filemark" sha="59a1912f8" date="2026-04-25" title="Fix MindMap KaTeX rendering — playground stylesheet + foreignObject sizing" author="aman"></CommitCard>

PR states: `open` (emerald) · `merged` (violet) · `closed` (rose) · `draft` (zinc). Issues: `open` / `closed`. Each card links to the GitHub URL.

---

## 2. FileTree — interactive folder/file outline

<FileTree>
filemark/
  packages/
    mdx-viewer/
      src/
        components/
          MindMap.tsx
          DocBlock.tsx
          Heatmap.tsx
        index.ts
      package.json
  apps/
    chrome-ext/
      src/
      manifest.json
    playground/
      src/
  examples/
    showcase.md
    mindmap-full.md
  README.md
</FileTree>

Trailing `/` marks a folder. Indent unit auto-detected from first indented line.

---

## 3. EnvVarsTable — env var reference

<EnvVarsTable>

<Env name="DATABASE_URL" type="url" required secret>
Postgres connection string. Format `postgres://user:pass@host:5432/db?sslmode=require`.
</Env>

<Env name="LOG_LEVEL" type="enum" default="info">
One of `debug` / `info` / `warn` / `error`. Set higher in prod.
</Env>

<Env name="API_KEY" type="string" required secret>
Public-API rate-limit key. Rotate quarterly.
</Env>

<Env name="FEATURE_BETA_TASKS" type="boolean" default="false">
Toggles the experimental task panel UI.
</Env>

</EnvVarsTable>

`required` = red pill. `secret` = amber pill + masks the default value.

---

## 4. Lightbox — click-to-fullscreen images

Single image:

<Lightbox src="https://markmap.js.org/favicon.png" alt="Markmap logo"></Lightbox>

Multi-image grid (click any to enter fullscreen + arrows / Esc to navigate):

<Lightbox>
  <img src="https://markmap.js.org/favicon.png" alt="A" />
  <img src="https://markmap.js.org/favicon.png" alt="B" />
  <img src="https://markmap.js.org/favicon.png" alt="C" />
</Lightbox>

---

## 5. Carousel — scroll-snap card row

<Carousel>

<Slide title="Quick start">
Drop a `.md` file onto the toolbar icon. Done.
</Slide>

<Slide title="Drag a folder">
Every supported file lands in the library, indexed for search.
</Slide>

<Slide title="Pin favourites">
Star any file — it sticks to the top of the sidebar.
</Slide>

<Slide title="Auto-refresh">
Edit in any editor; filemark re-renders on save.
</Slide>

<Slide title="No cloud">
Everything local. Zero accounts, zero tracking.
</Slide>

</Carousel>

Pure CSS scroll-snap — no JS scroll listener needed.

---

## 6. Gauge — single-value dial

<Gauge value="72" label="Coverage" unit="%" target="80" thresholds="40,70"></Gauge>

<Gauge value="38" label="Bug-fix rate" unit="%" thresholds="50,80"></Gauge>

<Gauge value="91" label="Uptime" unit="%" target="99" thresholds="95,99"></Gauge>

`thresholds="X,Y"` defines colour bands: `[0..X) = danger (rose)`, `[X..Y) = warn (amber)`, `[Y..] = success (emerald)`. Optional `target` adds a tick mark.

---

## 7. Treemap — nested rectangles sized by value

<Treemap height="320">
name,value,group
React,4500,frontend
Vue,2100,frontend
Svelte,900,frontend
Solid,400,frontend
Express,3200,backend
Fastify,1100,backend
Hono,800,backend
Postgres,2800,db
SQLite,1600,db
Redis,1900,db
</Treemap>

Tile colour cycles by group. Hover any tile for the exact value. Tiles smaller than ~30px hide labels.

---

## 8. Quiz — multi-choice question with reveal

<Quiz question="What does `colorFreezeLevel: 2` do in markmap?">

<Choice>Limits the colour palette to 2 distinct hues.</Choice>
<Choice correct>Stops the per-depth colour cycle at depth 2 — descendants inherit the parent colour.</Choice>
<Choice>Freezes the entire mindmap so it can't be panned.</Choice>
<Choice>Sets the maximum zoom level to 2x.</Choice>

</Quiz>

<Quiz question="Which planning template fits a Shape-Up two-week budget?">

<Choice>`<DocBlock kind="prfaq">` — Amazon press-release-first.</Choice>
<Choice>`<DocBlock kind="rfc">` — request for comments.</Choice>
<Choice correct>`<DocBlock kind="pitch">` — problem + appetite + fat-marker solution.</Choice>
<Choice>`<DocBlock kind="postmortem">` — incident retro.</Choice>

</Quiz>

---

## 9. Poll — single-question vote, persisted locally

<Poll id="favorite-tier" question="Which Tier excited you most?">

<PollOption>Tier 1 — Steps + Cards + APIEndpoint + VideoEmbed + Diff + Glossary + LastUpdated</PollOption>
<PollOption>Tier 2 — Heatmap + AnnotatedImage + PullQuote + Sparkline + Footnote</PollOption>
<PollOption>Tier 3 — GitHub cards + FileTree + Lightbox + Carousel + Gauge + Treemap + Quiz + Poll</PollOption>

</Poll>

Counts persist via `localStorage` keyed by `id=`. **Local-only** — no server / no cross-user aggregation.

---

## 10. AISummary — placeholder slot

<AISummary status="pending"></AISummary>

<AISummary status="ready">
This doc walks through 12 Tier 3 rich-doc components added in M16 — GitHub cards, file tree, env vars table, lightbox, carousel, gauge, treemap, quiz, poll, and three misc helpers. Most are static; Lightbox + Carousel + Quiz + Poll add lightweight interactivity. Author writes each component's content; AISummary becomes useful when a host wires a summariser into the slot.
</AISummary>

The host (chrome-ext or any consumer) can detect `<AISummary status="pending">` elements + fill them by injecting children at runtime.

---

## 11. CalloutWithAction — Callout + primary button

<CalloutWithAction tone="info" title="Try it in the playground" action="Open playground" href="https://github.com/thesatellite-ai/filemark/tree/main/apps/playground">
The playground bundles every example in this directory. Pick any from the sidebar to see the source + rendered output side-by-side.
</CalloutWithAction>

<CalloutWithAction tone="warn" title="MV3 strict CSP applies" action="Read the constraint" href="#">
Inside the chrome extension, no `unsafe-eval` and no remote scripts. Components that need third-party libs (markmap, KaTeX) bundle their deps locally.
</CalloutWithAction>

<CalloutWithAction tone="success" title="All 13 markmap features work" action="See mindmap-full.md" href="./mindmap-full.md">
Bullets, headings, math, code, tables, frontmatter — every authoring pattern from the markmap REPL.
</CalloutWithAction>

---

## 12. AuthorCard — inline bio

<AuthorCard name="Ada Lovelace" role="founding engineer · planning surface" avatar="https://markmap.js.org/favicon.png" url="https://github.com/" twitter="ada" github="ada">
Wrote the first version of every M9 component. Lives in markdown.
</AuthorCard>

---

## 13. PackageBadge — npm version + downloads + license + stars

<PackageBadge name="@filemark/mdx" type="npm" version="0.1.0" license="MIT"></PackageBadge>

<PackageBadge name="markmap-view" type="npm" version="0.18.12" downloads="42K/wk" license="MIT" stars="13.7K"></PackageBadge>

<PackageBadge name="@filemark/datagrid" type="npm" version="0.1.0" downloads="1.2K/wk"></PackageBadge>

Static badge — author fills props by hand or via a build script. Future: live fetch from npm registry.
