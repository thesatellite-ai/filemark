# Stats & ADR — full feature tour

Two small, layout-only components for planning / spec docs:

- **`<Stats>` / `<Stat>`** — KPI card grid. Value + delta + optional
  description. Auto-colors the delta (green for `+`, red for `-`).
- **`<ADR>`** — Architecture Decision Record block. Status pill,
  id, date, title; body is free-form markdown.

No CSV, no data-layer, no new deps. Pure JSX components.

---

## 1. Stats — minimum

<Stats>
  <Stat title="MRR" value="$128,400" />
  <Stat title="Active users" value="3,210" />
  <Stat title="NPS" value="42" />
  <Stat title="Churn" value="1.8%" />
</Stats>

Just titles + values. `<Stats>` defaults to a responsive 1/2/3/4-column
grid (mobile / sm / lg / xl).

---

## 2. Stats — with delta (auto color from sign)

<Stats>
  <Stat title="MRR" value="$128,400" delta="+12.4%" description="vs last month" />
  <Stat title="Active users" value="3,210" delta="-2.1%" description="DAU 7-day avg" />
  <Stat title="NPS" value="42" delta="+5" description="quarterly" />
  <Stat title="Churn" value="1.8%" delta="-0.3%" description="lower is better" />
</Stats>

`+` prefix → up arrow + green. `-` prefix → down arrow + red.
`description=` adds a muted caption.

---

## 3. Stats — override intent (semantic ≠ sign)

For metrics where "down is good" (churn, latency, bug count), override
the auto-inferred tone with `intent=`:

<Stats cols="3">
  <Stat title="p95 latency" value="142 ms" delta="-8 ms" intent="success" description="target ≤ 150 ms" />
  <Stat title="Open bugs" value="17" delta="-4" intent="success" description="WoW" />
  <Stat title="Deploys" value="38" delta="+6" intent="info" description="this month" />
</Stats>

A `-8 ms` drop in latency gets shown as success (green) instead of the
default danger (red).

---

## 4. Stats — explicit column count

<Stats cols="2">
  <Stat title="Revenue" value="$1.24M" delta="+18%" />
  <Stat title="Customers" value="842" delta="+24" />
</Stats>

<Stats cols="6">
  <Stat title="Mon" value="120" />
  <Stat title="Tue" value="145" />
  <Stat title="Wed" value="138" />
  <Stat title="Thu" value="162" />
  <Stat title="Fri" value="151" />
  <Stat title="Sat" value="94" />
</Stats>

`cols=` accepts `2` / `3` / `4` / `5` / `6`. Omit for responsive
auto-fill.

---

## 5. Stats — as navigation cards (`href=`)

<Stats cols="3">
  <Stat title="Datagrid" value="25 column types" description="→ sort, filter, group, export" href="#" />
  <Stat title="Chart" value="7 built-in types" description="→ bar, line, pie, area, scatter, funnel, radar" href="#" />
  <Stat title="Kanban" value="Group by any column" description="→ visual board from a CSV" href="#" />
</Stats>

Wrap the card in a link by passing `href=`.

---

## 6. Stats — flat / no-change

<Stats cols="3">
  <Stat title="Uptime" value="99.98%" delta="0" description="matches SLA" />
  <Stat title="Error rate" value="0.02%" delta="+0.01%" intent="warn" description="watch" />
  <Stat title="Saturation" value="68%" delta="+0" description="flat WoW" />
</Stats>

Zero delta → flat (em-dash) arrow + muted tone.

---

## 7. ADR — a simple decision record

<ADR status="accepted" id="ADR-007" date="2026-04-23" title="Use recharts for @filemark/chart">

### Context

Filemark renders under Chrome MV3 CSP, which forbids `unsafe-eval`.
We need a chart library that:

- Works without `new Function()` / `eval`
- Has SVG (not canvas — MV3 issues)
- Can be lazy-loaded to keep the main bundle small

### Decision

Adopt **recharts**. Lazy-loaded via dynamic `import()`, wrapped in a
`RechartsProvider` context so host apps can pre-register it.

### Consequences

- **Pro.** Ergonomic React API, composable primitives, ~50 KB gzipped.
- **Pro.** Already SVG-native; no canvas-context issues.
- **Con.** Largest of the options evaluated (chart.js ≈ 40 KB + wrapper).
- **Mitigation.** Dynamic import means the bundle cost only lands on docs
  that actually render a chart.

</ADR>

Attrs: `status`, `id`, `date`, `title`. Body is normal markdown — use
whatever sectioning fits the decision (conventional: Context / Decision
/ Consequences).

---

## 8. ADR — status variants

<ADR status="proposed" id="ADR-012" date="2026-04-24" title="Move auth to Passkey-only">

### Context
Passwords + TOTP are getting phished. Passkey support is universal now.

### Decision (proposed)
Cut over to Passkey-only for new signups; legacy users migrate on next login.

### Consequences
- Large UX shift.
- Needs browser support gate (not every enterprise env supports passkeys yet).

</ADR>

<ADR status="rejected" id="ADR-005" date="2026-03-15" title="Custom OAuth proxy">

### Context
Evaluated building our own OAuth proxy to unify Google / GitHub / MS login.

### Decision
**Rejected.** Scope too large; existing auth provider covers 98% of needs.

### Consequences
Revisit only if auth provider pricing changes materially.

</ADR>

<ADR status="deprecated" id="ADR-002" date="2025-11-01" title="jQuery for admin dashboard">

### Context
Admin dashboard originally shipped with jQuery + legacy build tools.

### Decision (deprecated 2026-04-01)
Marked deprecated as dashboard is rewritten to React.

### Consequences
No new jQuery-era code accepted in `admin/`. Tracking removal in #812.

</ADR>

<ADR status="superseded" id="ADR-003" date="2025-12-10" title="Use Zustand for app state" superseded-by="ADR-009">

### Context
Initial choice for app-level state.

### Decision
Zustand for all shared UI state.

### Consequences
Replaced by Redux Toolkit (see ADR-009) after scaling needs emerged.

</ADR>

Five statuses: **proposed** (info / blue), **accepted** (success /
green), **rejected** (danger / red), **deprecated** (muted / gray),
**superseded** (warn / amber).

---

## 9. ADR — with supersedes / superseded-by links

<ADR status="accepted" id="ADR-009" date="2026-01-20" title="Use Redux Toolkit for app state" supersedes="ADR-003">

### Context
Zustand (ADR-003) served well at small scale; we need stricter
conventions as state surface grew.

### Decision
Adopt Redux Toolkit for all cross-feature state. Keep Zustand for
component-local stores only.

### Consequences
Migration is ticketed per feature slice. No big-bang rewrite.

</ADR>

`supersedes=<id>` / `superseded-by=<id>` render as small inline refs in
the header's right side.

---

## 10. Stats + ADR in the same doc

A realistic planning doc:

<Stats cols="4">
  <Stat title="Decisions logged" value="14" delta="+3" description="YTD" />
  <Stat title="Active ADRs" value="11" delta="+2" intent="info" />
  <Stat title="Superseded" value="2" />
  <Stat title="Rejected" value="1" />
</Stats>

<ADR status="accepted" id="ADR-014" date="2026-04-23" title="Ship Stats + ADR components">

### Context
Planning docs accumulate KPIs and decisions. Filemark can render data
(datagrid / chart / kanban) but has no native idiom for either pattern.

### Decision
Add `<Stats>` / `<Stat>` and `<ADR>` as first-class MDX components.
Both are pure layout — no data layer, no new deps.

### Consequences
- Thesis slice (chart / kanban / stat / ADR from PLANNING_COMPONENTS.md)
  is complete.
- Next planning-doc beat: Timeline / Gantt + 2×2 matrix.

</ADR>
