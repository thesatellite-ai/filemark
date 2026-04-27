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

### Layout modes

Default: responsive grid — vertical stack on mobile, equal columns on `sm+`. Best for short bullets.

For dense lanes (nested `<TaskList>` / `<Datagrid>` / long descriptions) use `laneMinWidth="320"` (or shorthand `scroll`) — each lane gets at least the given width and the whole roadmap scrolls horizontally when `lanes × minWidth > viewport`. Click the expand icon in the header to toggle fullscreen (Esc to exit) so wide content stretches across the screen.

<Roadmap title="Phased rollout (laneMinWidth=320)" laneMinWidth="320">

<Lane name="Phase 0 — recon" subtitle="map the territory">

- Audit current auth middleware contracts
- Catalogue every JWT consumer (mobile / web / admin / pickup)
- Document refresh-token flow per client
- Diagram session lifecycle states

</Lane>

<Lane name="Phase 1 — schema" subtitle="DB-first foundation" tone="info">

- Add `blocked` column to users
- Create `user_sessions` table (jti, refresh_hash, device, IP, lifecycle)
- Index user_id (partial: WHERE revoked_at IS NULL)
- Index last_seen for LRU eviction

</Lane>

<Lane name="Phase 2 — middleware" subtitle="hot path lockdown" tone="warn">

- In-memory blockedUsers + revokedJTIs sync.Maps
- Write-through on block/revoke (DB then map)
- 15-min refresh job: scan DB → reconcile maps
- Eviction policy: drop entries past JWT exp

</Lane>

<Lane name="Phase 3 — flows" subtitle="web/admin/pickup refresh" tone="success">

- /auth/refresh endpoint with grace window
- Rotating refresh tokens per refresh
- 10s grace for concurrent refresh races
- Geo-IP enrichment + UA capture

</Lane>

<Lane name="Phase 4 — endpoints" subtitle="user-facing surfaces">

- GET /me/sessions (list + filter active)
- DELETE /me/sessions/:id (logout single device)
- POST /admin/users/:id/block (admin block flow)
- Audit log: who revoked what, when, why

</Lane>

</Roadmap>

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
