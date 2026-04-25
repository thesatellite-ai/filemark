---
title: MindMap — full feature tour
---

# MindMap — full feature tour

Filemark's `<MindMap>` is a thin wrapper over [markmap](https://markmap.js.org/) — every authoring feature on the [markmap REPL](https://markmap.js.org/repl) works here. Twelve patterns covering bullets, headings, rich text, math, code, multi-line, frontmatter, mixed content, and the legacy children form.

<DocStatus state="approved" owner="aman" updated="2026-04-25"></DocStatus>

---

## 1. Basic bullet outline

The simplest form — one root, nested branches. Use 2-space indent per level.

```mindmap Filemark at a glance
- Filemark
  - Visualize
    - Charts
    - Kanban
    - Datagrid
  - Author
    - Tasks
    - DocBlock
  - Connect
    - Backlinks
    - MindMap
```

---

## 2. Headings as the outline

markmap also parses `# ## ###` headings. Mix freely with bullets — bullets become leaves under their nearest heading.

```mindmap
# Roadmap

## Now (this sprint)

- Ship M13 MindMap upgrade
- Polish DocBlock variants

## Next (this quarter)

- Whiteboard / sticky-board
- GraphView (force-directed link graph)

## Later

- AI in-doc draft
- Voice capture
```

---

## 3. Rich inline text — bold, italic, code, links

Every node renders **inline markdown**. Mix emphasis, code spans, and links freely.

```mindmap Inline formatting
- Filemark **planning** suite
  - **Bold** branches stand out
  - *Italic* notes for emphasis
  - `inline code` renders monospace
  - [Markmap docs](https://markmap.js.org)
  - [Filemark on GitHub](https://github.com/thesatellite-ai/filemark)
  - ~~Struck-through~~ deprecated paths
```

---

## 4. Multi-line node text

A blank line inside a bullet body keeps it as the same node — text wraps inside the node's foreign-object container.

```mindmap
- Brainstorm
  - Quick ideas
    short, punchy
  - Long-form thought  
    Sometimes a node needs more than one line. Wrap freely.
    The renderer respects soft breaks.
  - Just a single line
```

---

## 5. Code blocks inside nodes

Fenced code blocks inside a bullet render as inline code blocks within the node body. Useful for grammar / DSL examples.

```mindmap Sigil cheatsheet
- Task sigils
  - Owner

    `@alice`
  - Priority

    `!p0` `!p1` `!p2`
  - Due

    `~2026-05-10`
  - Tag

    `#bug` `#refactor`
```

---

## 6. Math (KaTeX) inside nodes

Inline math via `$…$` renders through markmap's built-in KaTeX plugin. Filemark pre-publishes the locally-bundled `katex` module to `window.katex` before markmap's parser runs, so math works under MV3 strict CSP without any CDN load.

**Layout caveat:** KaTeX-rendered fractions / `\sqrt` / matrices produce tall, wide foreignObject children. markmap's auto-fit then shrinks every other node to make room. Set `maxWidth` (and prefer single-line inline math) to keep the tree readable.

```mindmap
---
markmap:
  maxWidth: 360
---

# Quadratic formula

## Statement

- The roots of $ax^2 + bx + c = 0$ are given by $x = (-b \pm \sqrt{b^2 - 4ac}) / (2a)$

## Discriminant — $\Delta = b^2 - 4ac$

- $\Delta > 0$ → two real roots
- $\Delta = 0$ → one double root
- $\Delta < 0$ → two complex roots

## Vertex

- $x_v = -b / (2a)$
- $y_v = c - b^2 / (4a)$
```

---

## 7. Frontmatter options (markmap directives)

The first lines of a fenced `mindmap` block can carry markmap's `markmap:` frontmatter — colour palette, max width, initial expand level, etc. See the [markmap option reference](https://markmap.js.org/docs/json-options).

```mindmap Custom palette + max width
---
markmap:
  colorFreezeLevel: 2
  maxWidth: 220
  initialExpandLevel: 2
---
- Architecture
  - Frontend
    - React 19
    - Tailwind v4
    - shadcn / basecn
  - Build
    - Vite 6
    - tsup
    - pnpm workspaces
  - Adapters
    - Chrome MV3
    - File System Access API
    - IndexedDB
```

---

## 8. Mixed bullets + sub-headings

A heading inside a bullet creates a sub-tree without breaking the parent's branch.

```mindmap Mixed structure
# Filemark v1.0

## Shipped components

- Tasks
  ### Sigils
  - `@owner`
  - `!priority`
  - `~due`
- DocBlock
  ### Kinds
  - prfaq
  - rfc
  - pitch
  - postmortem

## In flight

- Backlinks
- MindMap
- GraphView
```

---

## 9. Long single-branch chain

Stress-test for deep nesting — the layout still flows.

```mindmap Why does this fail?
- The deploy on 2026-04-22 broke production
  - The migration ran out of order
    - The deploy script doesn't sequence migrations
      - Nobody owns the deploy script
        - It was inherited from a previous team
          - Tooling responsibilities were assumed, not assigned
            - We never had a "DRI" role for shared infra
```

---

## 10. Wide branch fan-out

Many siblings under a single root — markmap auto-distributes vertically.

```mindmap Filemark component catalogue
- Filemark
  - Callout
  - Tabs
  - Details
  - Stats
  - ADR
  - DocBlock
  - DocStatus
  - Datagrid
  - Chart
  - Kanban
  - Mermaid
  - Schema
  - Tasks
  - TaskList
  - TaskStats
  - TaskTimeline
  - MindMap
  - Backlinks
  - OKRtree
  - WeightedScore
  - Matrix2x2
  - Timeline
  - ReadingTime
  - FiveWhys
  - Roadmap
  - DecisionTree
```

---

## 11. With explicit height + title

Author-controlled rendering area — useful when a mindmap has lots of depth or you want it to be the dominant visual on the page. Pass `height=N` (bare number = px, or `560px` / `70vh`) in the fence meta; everything else on that line becomes the title.

```mindmap height=560 Quarterly themes
- Q1 — foundations
  - Tasks DSL
  - Datagrid
  - Chart
- Q2 — knowledge layer
  - Backlinks
  - GraphView
  - Glossary
- Q3 — collaboration
  - Live cursors
  - Reactions
  - Annotations
- Q4 — AI-native
  - Inline draft
  - Voice capture
  - Smart rollups
```

---

## 12. Legacy `<MindMap>` wrapping a markdown list

Still supported as a fallback. Prefer the fenced form for reliability (see [MINDMAP_ADR.md](./MINDMAP_ADR.md) — the markdown-block-edge gotcha).

<MindMap title="Wrapper form (legacy)">

- Filemark
  - Visualize
    - Charts
    - Kanban
  - Author
    - Tasks
    - DocBlock

</MindMap>

---

## 13. Every-feature reference (kitchen sink)

One diagram exercising the full set of supported features — frontmatter directives, headings + bullets mixed, every inline-formatting variant, fold comments, math, code blocks, tables, images. Use it as the reference doc when something doesn't render the way you expect.

````mindmap
---
markmap:
  colorFreezeLevel: 2
  maxWidth: 320
---

# Filemark

## Links

- [Filemark on GitHub](https://github.com/thesatellite-ai/filemark)
- [The skill](https://github.com/thesatellite-ai/filemark/blob/main/skills/filemark/SKILL.md)

## Patterns

- [Planning v2 — full](./planning-v2-full.md)
- [Tasks — full](./tasks-full.md)
- [Datagrid — full](./datagrid-full.md)

## Features

Note that if blocks and lists appear at the same level, the lists will be ignored.

### Lists

- **strong** ~~del~~ *italic* ==highlight==
- `inline code`
- [x] checkbox
- Katex: $x = {-b \pm \sqrt{b^2-4ac} \over 2a}$ <!-- markmap: fold -->
  - [Math examples](#math-examples)
- Now we can wrap very very very very long text with the `maxWidth` option
- Ordered list
  1. item 1
  2. item 2

### Blocks

```js
console.log('hello, JavaScript')
```

| Products | Price |
|-|-|
| Apple | 4 |
| Banana | 2 |

![](https://markmap.js.org/favicon.png)
````

## Authoring gotchas (from the REPL doc)

A few markmap quirks worth memorising:

| Gotcha | What it means |
|---|---|
| **Lists vs blocks at same level** | If both a bulleted list AND a block (code / table / image / paragraph) appear under the same heading, the list is *ignored*. Pick one or push them to different depths. |
| **`<!-- markmap: fold -->` HTML comment** | Place inside any node to make it default-collapsed. Click the circle to expand. |
| **`==highlight==`** | Markmap's parser supports `==text==` for highlighted spans (rendered with `<mark>`). |
| **`[x]` checkboxes** | GFM task syntax renders as `☑` / `☐` inside the node body. |
| **Frontmatter `markmap:` block** | Carries options — `colorFreezeLevel`, `maxWidth`, `initialExpandLevel`, `duration`, etc. See the [JSON option reference](https://markmap.js.org/docs/json-options). |
| **Images** | `![](url)` renders inline; the URL must be reachable (public CORS, data URI, or part of the page). |
| **Tables** | GFM tables render inside nodes; very wide tables get scroll inside the node body. |
| **Math** | `$inline$` and `$$display$$` via KaTeX. Math nodes can be longer than text nodes — pair with `colorFreezeLevel` to keep visual hierarchy. |

## Controls cheatsheet

Every mindmap above honours these inputs:

| Input | Action |
|---|---|
| Mouse wheel | Zoom in / out |
| Click + drag on canvas | Pan freely |
| `+` / `=` | Zoom in (keyboard) |
| `-` / `_` | Zoom out |
| `0` | Fit to view |
| `F` | Toggle fullscreen |
| Toolbar `+` `−` `⤢` `⛶` | Same actions, click-driven |
| Click any node circle | Collapse / expand its branch |

Click anywhere on a mindmap to focus it (a primary outline appears) before using keyboard shortcuts.
