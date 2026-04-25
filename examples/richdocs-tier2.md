---
title: Rich docs Tier 2 — full showcase
---

# Rich docs Tier 2 — full showcase

Six M15 components — Heatmap, AnnotatedImage, PullQuote, Testimonials, Sparkline, Footnote.

<DocStatus state="approved" owner="aman" updated="2026-04-25"></DocStatus>

---

## 1. Heatmap — GitHub-style activity grid

Inline data:

<Heatmap title="Daily commits" year="2026">
day,commits
2026-01-04,3
2026-01-05,1
2026-01-12,4
2026-01-19,2
2026-02-02,5
2026-02-03,7
2026-02-09,3
2026-02-16,1
2026-02-17,2
2026-03-02,6
2026-03-09,4
2026-03-16,8
2026-03-23,3
2026-03-30,5
2026-04-06,9
2026-04-13,7
2026-04-20,11
2026-04-21,4
2026-04-22,6
2026-04-23,8
2026-04-24,12
2026-04-25,5
</Heatmap>

Hover any cell for the date + value. Cells colour-grade from `--muted` (no activity) → `--primary` (peak day).

---

## 2. AnnotatedImage — numbered hotspots over an image

<AnnotatedImage src="https://markmap.js.org/favicon.png" alt="Markmap logo" caption="Click any pin to see the hotspot description.">

<Hotspot x="0.20" y="0.30" label="Top-left">
The top-left quadrant of the logo. Hotspots can hold any markdown — **bold**, `code`, [links](https://markmap.js.org).
</Hotspot>

<Hotspot x="0.78" y="0.32" label="Top-right">
Right side. Markdown body works fully — even nested lists:

- one
- two
- three
</Hotspot>

<Hotspot x="0.50" y="0.78" label="Bottom-center">
Click again to close. Press elsewhere to dismiss.
</Hotspot>

</AnnotatedImage>

Coords are normalised 0..1 (left/top origin). Useful for screenshot walkthroughs, UI reviews, design specs.

---

## 3. PullQuote — testimonial / featured statement

<PullQuote author="Linus Torvalds" role="creator of Linux">
Talk is cheap. Show me the code.
</PullQuote>

<PullQuote author="Grace Hopper" role="rear admiral, US Navy">
The most damaging phrase in the language is: it's always been done that way.
</PullQuote>

---

## 4. Testimonials — grid of pull quotes for marketing

<Testimonials cols="3">

<PullQuote author="Ada" role="early adopter">
Filemark turned our planning docs into something the team actually opens.
</PullQuote>

<PullQuote author="Linus" role="infra lead">
The Datagrid alone is worth installing the extension.
</PullQuote>

<PullQuote author="Margaret" role="product manager">
DocBlock kind=prfaq is now our default for any product spec.
</PullQuote>

</Testimonials>

---

## 5. Sparkline — inline trend visual

Latest weekly commits: <Sparkline data="3,5,4,7,6,8,9" /> · 7-day max <Sparkline data="3,5,4,7,6,8,9" type="bar" color="emerald" />

Rendered inline next to text or values. Two types — `line` (default) or `bar`. Custom colour via `color="primary|blue|emerald|amber|rose|violet"`.

| Metric | Last 7 days | Trend |
|---|---|---|
| MRR | $128K | <Sparkline data="100,108,112,118,121,125,128" color="emerald" /> |
| Bounce | 3.4% | <Sparkline data="4.1,4.0,3.9,3.8,3.7,3.6,3.4" color="amber" /> |
| Errors | 12 | <Sparkline data="20,18,15,14,13,12,12" color="rose" type="bar" /> |

---

## 6. Footnote — Tufte-style inline notes

Filemark renders every doc with persistent state.<Footnote>Persistence uses an injected `StorageAdapter` — IndexedDB inside the chrome-ext, in-memory in the playground.</Footnote> Tasks, scroll position, expanded folders, view modes — all preserved across reloads.<Footnote>The host wires the adapter via `<MDXViewer storage={…}>`.</Footnote>

The MindMap component uses [markmap](https://markmap.js.org/)<Footnote>Same engine HackMD uses. We lazy-load it so docs without a mindmap don't pay the bundle cost.</Footnote> with a custom toolbar for zoom + fullscreen.

Click any numbered footnote to toggle the popover. Numbers auto-increment per render.
