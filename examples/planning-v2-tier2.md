---
title: Planning v2 Tier 2 — full showcase
tasks-version: 1
defaults:
  owner: aman
  area: planning
---

# Planning v2 Tier 2 — full showcase

Four M10 components — WeightedScore, MeetingNotes, Matrix2x2, Timeline — exercised in one doc.

<DocStatus state="approved" owner="aman" updated="2026-04-24" note="all M10 components live"></DocStatus>

---

## 1. WeightedScore — pick the best option from a weighted matrix

<WeightedScore title="Pick the next infra investment">

<Criterion name="Effort"  weight="2" inverse />
<Criterion name="Impact"  weight="3" />
<Criterion name="Risk"    weight="1" inverse />
<Criterion name="Cost"    weight="2" inverse />

<Option name="Refactor the parser"        scores="3,4,2,3" note="Brittle but well understood" />
<Option name="Add a cache layer"          scores="2,3,1,2" />
<Option name="Rewrite from scratch"       scores="5,5,5,5" note="High risk, high reward" />
<Option name="Pay for a managed service"  scores="1,3,1,5" />

</WeightedScore>

The `inverse` flag on Effort / Risk / Cost flips them so "lower is better" — score × weight inverts. Bar shows the winner with 🏆 + primary border.

---

## 2. MeetingNotes — capture template for a single sync

<DocBlock kind="meeting" title="Q3 planning sync" date="2026-04-24" time="14:00–15:00 UTC" facilitator="aman" attendees="aman, grace, linus, ada">

### Agenda

1. Q3 OKR finalization
2. M10 component scope
3. Hiring plan

### Discussion

Walked through the OKR draft. Consensus on the three objectives; one KR (10K WAU) feels aggressive — adjust to 8K with a stretch.

### Decisions

- **OKR adjusted:** WAU target 8K (stretch 10K)
- **M10 scope locked:** WeightedScore + MeetingNotes + Matrix2x2 + Timeline this sprint
- **Hiring:** open one infra role this quarter

### Action items

- [ ] Update OKR doc with new target @aman !p1 ~2026-04-26 (q3-planning) ^task-okr-update
- [ ] Draft infra-hire JD @grace !p2 ~2026-05-01 (q3-planning) ^task-jd-draft
- [ ] Schedule Q3 kickoff next Monday @linus !p1 ~2026-04-29 (q3-planning) ^task-kickoff

</DocBlock>

---

## 3. Matrix2x2 — prioritization grid

<Matrix2x2 x-axis="Effort" y-axis="Impact" title="Tier 1 vs Tier 2 candidate components">

<Item x="0.2" y="0.9">Reveal-in-sidebar</Item>
<Item x="0.3" y="0.8">DocStatus</Item>
<Item x="0.25" y="0.7">Backlinks</Item>
<Item x="0.4" y="0.85">PRFAQ template</Item>
<Item x="0.5" y="0.5">MindMap</Item>
<Item x="0.6" y="0.6">OKRtree</Item>
<Item x="0.7" y="0.4">DailyNote button</Item>
<Item x="0.85" y="0.7">Whiteboard</Item>
<Item x="0.8" y="0.85">GraphView</Item>
<Item x="0.55" y="0.25">Voice capture</Item>
<Item x="0.85" y="0.2">AI inline draft</Item>

</Matrix2x2>

Coords are 0..1; (0,0) is bottom-left of the inner grid. Top-left = "Quick wins" (low effort + high impact = build first); top-right = "Big bets"; bottom-right = "Time sinks"; bottom-left = "Fillers".

---

## 4. Timeline — Q3 plan, lanes by team

<Timeline title="Q3 — design / eng / ship lanes" from="2026-07-01" to="2026-09-30">

<Event date="2026-07-15" lane="design" title="Mocks final" />
<Event date="2026-07-22" lane="eng" title="Spike done" />
<Event date="2026-08-01" end="2026-08-22" lane="eng" title="Build phase" />
<Event date="2026-08-15" lane="design" title="Polish handoff" />
<Event date="2026-08-25" end="2026-09-01" lane="eng" title="QA + bug bash" />
<Event date="2026-08-30" lane="ship" title="Beta cohort opens" />
<Event date="2026-09-15" lane="ship" title="GA launch" highlight />
<Event date="2026-09-22" lane="ship" title="Retro" />

</Timeline>

Diamond markers = single-day events; bars = date-range events (`date` + `end`). `highlight` colour-promotes a milestone to primary. The vertical dashed line marks today (when within range).

---

## Source — all tasks

- [ ] Update OKR doc with new target @aman !p1 ~2026-04-26 (q3-planning) ^task-okr-update
- [ ] Draft infra-hire JD @grace !p2 ~2026-05-01 (q3-planning) ^task-jd-draft
- [ ] Schedule Q3 kickoff next Monday @linus !p1 ~2026-04-29 (q3-planning) ^task-kickoff
