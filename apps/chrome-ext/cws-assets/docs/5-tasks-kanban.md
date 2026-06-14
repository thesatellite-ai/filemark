---
title: Launch board
defaults:
  project: launch
  area: cws
---

# Launch board — markdown is the source

Author tasks as ordinary markdown bullets with sigils (`@owner`, `!priority`, `~due`, `(project)`). Drop one `<Kanban md/>` tag and the same file renders as a board, grouped however you want.

<Kanban md group-by="status" order="todo,in_progress,done" title="Launch — by status" height="380"></Kanban>

## Source — the same bullets, edited inline

- [ ] Submit to Chrome Web Store @aman !p0 ~2026-06-17 ^task-submit
- [ ] Capture 5 listing screenshots @aman !p0 ~2026-06-15 ^task-shots
- [ ] Render 440×280 promo tile @aman !p0 ~2026-06-15 ^task-promo
- [ ] Generate OAuth refresh token @aman !p1 ~2026-06-16 ^task-oauth
- [ ] Trademark sanity check @aman !p2 ~2026-06-16 ^task-trademark
- [/] Listing copy locked @aman !p0 (final in CWS_LISTING.md) ^task-copy
- [x] Build Apple-style landing redesign @aman =2026-06-14 ^task-landing
- [x] Merge playground into /demo @aman =2026-06-14 ^task-merge
- [x] Cloudflare deploy + gateway KV @aman =2026-06-14 ^task-deploy
- [x] Privacy policy CWS-grade @aman =2026-06-14 ^task-privacy
- [x] Ship app-template to gateway repo @aman =2026-06-14 ^task-template
