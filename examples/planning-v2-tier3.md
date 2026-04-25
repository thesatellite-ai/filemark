---
title: Planning v2 Tier 3 — quick-win components
---

# Planning v2 Tier 3 — quick-win components

Four small but useful M11 additions — ReadingTime, FiveWhys, Roadmap, DecisionTree.

<DocStatus state="approved" owner="aman" updated="2026-04-24"></DocStatus>

<ReadingTime></ReadingTime>

---

## 1. ReadingTime — auto-counts words from the rendered article

The chip above this paragraph reads its own enclosing `.fv-mdx-body` and reports the estimated read time. Override the count or pace explicitly:

<ReadingTime words="2400"></ReadingTime>
<ReadingTime words="500" wpm="180"></ReadingTime>

---

## 2. FiveWhys — chained root-cause analysis

<FiveWhys problem="The deploy on 2026-04-22 broke production">

<Why>The migration ran out of order against the feature flag.</Why>
<Why>The deploy script doesn't sequence migrations against feature flag rollout.</Why>
<Why>Nobody owns the deploy script — it was inherited from the previous infra team.</Why>
<Why>We never had an "infra DRI" role for shared tooling.</Why>
<Why>Tooling responsibilities were assumed instead of assigned.</Why>

</FiveWhys>

The last Why is highlighted as the plausible root cause — assign an action item against it next.

---

## 3. Roadmap — now / next / later

<Roadmap title="Filemark roadmap (April → September 2026)">

<Lane name="Now" subtitle="this sprint">

- Ship M11 Tier 3 components
- Polish Backlinks panel
- Wire showcase docs into playground

</Lane>

<Lane name="Next" subtitle="this quarter" tone="info">

- GraphView (force-directed link graph)
- Chart annotations (vertical reference lines)
- Datagrid pivot
- Inline AI hooks

</Lane>

<Lane name="Later" subtitle="someday" tone="muted">

- Whiteboard / sticky-note canvas
- Voice capture
- Real-time collab
- VS Code consumer

</Lane>

</Roadmap>

Use `tone=` to colour-code lanes (`default`, `info`, `success`, `warn`, `danger`, `muted`).

---

## 4. DecisionTree — branching analysis (recursive)

<DecisionTree question="Should we migrate the planning docs to filemark?">

<Branch label="yes — green light">

<DecisionTree question="Big-bang or incremental?">

<Branch label="big-bang">All docs in one weekend. Risk: bad imports, blocked teams.</Branch>
<Branch label="incremental">

Per-team, two repos at a time. Slower but safer.

<DecisionTree question="Which team first?">

<Branch label="infra">Most markdown-fluent already.</Branch>
<Branch label="product">Highest doc volume, biggest payoff.</Branch>

</DecisionTree>

</Branch>

</DecisionTree>

</Branch>

<Branch label="no — stay on Notion">

Re-evaluate in Q4. Loss: AI integration, grep-ability.

</Branch>

</DecisionTree>

Branches collapse on click. Nested `<DecisionTree>` inside a `<Branch>` works recursively.
