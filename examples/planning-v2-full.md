---
title: Planning v2 — full showcase
tasks-version: 1
defaults:
  owner: aman
  area: planning
---

# Planning v2 — full showcase

Every component shipped in M9 — PRFAQ, RFC, Pitch, PostMortem, DocStatus, Backlinks, MindMap, OKRtree, DailyNote — exercised end-to-end so the rendering can be eye-balled in one tab.

<DocStatus state="approved" owner="aman" updated="2026-04-24" note="all M9 Tier 1 components live"></DocStatus>

---

## 1. PRFAQ — Amazon-style press-release-first

<DocBlock kind="prfaq" title="Filemark v1 — markdown the way it should be" subhead="Render, share, and plan from any .md file in Chrome — no DB, no server, no lock-in." date="2026-04-24" author="aman">

### Press release

Today we're launching Filemark, a Chrome extension that turns every `.md` and `.mdx` file on disk into a beautiful, interactive workspace. Drag in a folder, point at a `file://` URL, or open the in-browser playground — your markdown renders with charts, kanban boards, datagrids, tasks, ADRs, and more. The file stays the source of truth.

### Summary

Filemark is reader-first. AI writes markdown, humans grep markdown, filemark visualizes it. Tasks, plans, dashboards, and decision records all live in plain `.md` files. No proprietary format. No subscription.

### FAQ

**Q: Does it sync to the cloud?**
A: No. Everything is local-first. Your files stay on disk; filemark renders them in your browser.

**Q: Can my AI agent edit these files?**
A: Yes — this is the whole point. The skill at `skills/filemark/SKILL.md` teaches Claude / Cursor / Codex the syntax.

</DocBlock>

---

## 2. RFC — request-for-comments

<DocBlock kind="rfc" status="accepted" id="RFC-0001" date="2026-04-24" title="Adopt filemark for all internal planning docs" author="aman">

### Status

Accepted on 2026-04-24 after a two-week trial.

### Context

We were spreading planning docs across Notion, Linear, and Obsidian. Three sources of truth, no `grep`, every doc went stale.

### Proposal

Move every planning doc to a `docs/` directory of `.md` files in each repo. Render via filemark.

### Alternatives

- **Stay on Notion** — rejected; lock-in + no AI integration.
- **Roll our own renderer** — rejected; filemark already does it.
- **Use Obsidian** — rejected; editor-locked.

### Risks

- Markdown syntax learning curve for non-technical users — mitigated by the AI skill.
- No real-time collab — accepted; we use git anyway.

### Decision

Adopt filemark. Migrate all planning docs by end of Q3.

</DocBlock>

---

## 3. Pitch — Shape Up

<DocBlock kind="pitch" problem="The TaskPanel piles up tasks across files with no way to scope to the current file" appetite="2 days" owner="aman" title="TaskPanel scope toggle">

### Solution

Segmented control at the top of TaskPanel — Library / Folder / This file. Default per-session. `useTaskIndex` already has `tasksFor(activeFileId)` — wire it through.

### Rabbit holes

- Per-file persistence of scope choice — defer; per-session is enough.
- "Folder" semantics for nested folders — show all descendants, not just direct children.

### No-gos

- Don't add a fourth scope ("starred / open files only") yet — keep the UI tight.
- No drag-to-reorder scope tabs — they're a fixed three.

</DocBlock>

---

## 4. PostMortem — incident retrospective

<DocBlock kind="postmortem" severity="sev2" service="api" date="2026-04-22" duration="42 minutes" title="API 5xx spike during rollout">

### Summary

Deployed v3.4.1 to production at 14:18 UTC. Within 90 seconds, 5xx rate climbed to ~18% on the `/orders` endpoint. Rollback initiated at 14:30, complete at 15:00 UTC.

### Timeline

- **14:18** — v3.4.1 deployed.
- **14:20** — Pager fired (5xx > 5%).
- **14:24** — Oncall confirmed regression in OrderController.
- **14:30** — Rollback initiated.
- **15:00** — Rollback complete; error rate back to baseline.

### Root cause

A NULL guard on `order.shipping_address` was removed in the refactor, assuming the DB constraint had landed. The constraint had not yet been deployed to prod.

### Contributing factors

- The migration PR was merged but auto-deploy was paused.
- No staging integration test covered the NULL path.

### Action items

- [ ] Add NULL-path integration test to OrderController @aman !p1 ~2026-05-01 (incident-2026-04-22)
- [ ] Document deploy-order rule in onboarding doc @aman !p2 ~2026-05-08 (incident-2026-04-22)
- [ ] Add migration-status check to deploy gate @aman !p1 ~2026-05-05 (incident-2026-04-22)

</DocBlock>

---

## 5. Backlinks — inbound `[[wikilink]]` references

This is page renders any inbound links to it from other docs in the library. When this doc isn't being viewed inside the chrome-ext, the panel is empty (no link index outside the host).

<Backlinks title="Linked from" empty="No inbound links — open this doc inside the Filemark extension to see references."></Backlinks>

A reference to [[TASKS_PLAN]] elsewhere in the library would surface here on that doc's page.

---

## 6. MindMap — collapsible horizontal tree

```mindmap Filemark component map
- Filemark
  - Visual
    - Chart
    - Kanban
    - Stats
    - Datagrid
  - Decision
    - ADR
    - RFC
    - Pitch
    - PostMortem
  - Knowledge
    - Backlinks
    - DocStatus
    - MindMap
  - Workflow
    - Tasks
    - DailyNote
    - OKRtree
```

---

## 7. OKRtree — objectives + key results

<OKRtree>

<Objective title="Q3: become the planning tool of choice" owner="aman" due="2026-09-30">

<KR title="Ship 6 Tier-1 M9 components" tasks="task-m9-prfaq,task-m9-rfc,task-m9-pitch,task-m9-postmortem,task-m9-docstatus,task-m9-backlinks"></KR>
<KR title="10K weekly active users" current="6200" target="10000"></KR>
<KR title="<2% bounce rate" current="3.4" target="2" inverse note="lower is better"></KR>
<KR title="80% of trial users author at least one component" current="0.62" target="0.8"></KR>

</Objective>

</OKRtree>

---

## 8. DailyNote — date-stamped daily journal

<DocBlock kind="daily" date="2026-04-24" yesterday="2026-04-23" tomorrow="2026-04-25" mood="focused" weather="rainy">

## Plan for today

- [ ] Ship M9 Tier 1 components @aman !p0
- [ ] Update SKILL.md with new components @aman !p1
- [ ] Build showcase doc @aman !p1

## Notes

Locked in on planning components. Templates landed first, then knowledge connectivity (Backlinks), then visuals (MindMap), then workflow (DailyNote + OKRtree).

## Open from yesterday

<TaskList filter="is:open" sort="priority:asc" limit="10"></TaskList>

</DocBlock>

---

## DocStatus chip — also works mid-doc

Use the chip wherever you want a status pill — top of the doc, next to a section heading, end-of-page footer:

<DocStatus state="draft" owner="aman"></DocStatus>
<DocStatus state="review" owner="grace" updated="2026-04-23"></DocStatus>
<DocStatus state="approved" owner="linus" updated="2026-04-22"></DocStatus>
<DocStatus state="deprecated" owner="alice" note="superseded by RFC-0042"></DocStatus>
<DocStatus state="archived" owner="bob"></DocStatus>

---

## Source — all tasks

Tasks referenced by views above. One source, many lenses (per the SKILL.md "one-source rule for plan docs").

- [ ] Add NULL-path integration test to OrderController @aman !p1 ~2026-05-01 (incident-2026-04-22) ^task-incident-null-test
- [ ] Document deploy-order rule in onboarding doc @aman !p2 ~2026-05-08 (incident-2026-04-22) ^task-incident-deploy-doc
- [ ] Add migration-status check to deploy gate @aman !p1 ~2026-05-05 (incident-2026-04-22) ^task-incident-deploy-gate
