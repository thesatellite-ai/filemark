# Datagrid — full feature tour

Every column type, every flag. Drop this into Filemark to see each render. 1111

---

## 1. Primitives (auto-inferred — no type hint needed)

```csv
name,age,joined,active
Ada,30,2020-04-02,true
Grace,45,2015-11-19,false
Dennis,72,2001-06-02,true
```

The parser sniffs columns: `age` → number, `joined` → date, `active` → bool.

---

## 2. `status` — colored badge with convention defaults

```csv type:state=status title="Conventional tones"
id,name,state
1,build,done
2,deploy,pending
3,tests,failed
4,audit,review
5,rollout,info
6,archive,cancelled
```

Convention: `done/ok/active/passed` → success, `pending/todo/wip/review` → warn,
`failed/blocked/cancelled` → danger, `info/note/new` → info, else muted.

### `status` with explicit color overrides

```csv type:priority=status(P0:danger,P1:warn,P2:info,P3:muted) title="Ticket priorities"
id,title,priority
T-1,DB migration,P0
T-2,refactor mailer,P2
T-3,upgrade deps,P1
T-4,doc polish,P3
```

Color-map syntax: `status(key1:tone1,key2:tone2,…)`. Tones accepted:
`success`, `warn`, `danger`, `info`, `muted`, `primary`, `secondary`.
Aliases accepted: `red/green/amber/yellow/orange/blue/gray/grey/neutral`.

---

## 3. `tags` — comma-split chips with deterministic colors

```csv type:skills=tags title="Crew skills"
id,name,skills
1,Ada,"math,logic,poetry"
2,Grace,"compilers,nautical,english"
3,Linus,"kernel,git,rust"
4,Margaret,"apollo,fortran,safety"
```

Same tag → same color across reloads (FNV-1a hash → palette).

### Custom separator

```csv type:flags=tags(|) title="Pipe-separated"
id,feature,flags
1,search,"wasm|opt-in|experimental"
2,theme,"stable|shipped"
```

---

## 4. `checkmark` — read-only ✓ / —

```csv type:done=checkmark title="Shipped?"
id,milestone,done
M0,scaffold,yes
M1,core types,yes
M2,mdx pipeline,yes
M3,extension host,yes
M4,sidepanel,no
M5,link graph,no
```

---

## 5. `checkbox` — interactive + persisted (requires an id column)

```csv type:id=id type:done=checkbox title="Interactive checklist"
id,task,done
t-01,finish parser,true
t-02,wire remark-code-meta,true
t-03,design datagrid,true
t-04,resize columns,true
t-05,export json/md,true
t-06,column types,true
t-07,theming polish,false
t-08,VS Code host,false
```

Toggling any checkbox above writes to `StorageAdapter`; reload the page and
your state persists. Keyed by `filemark:datagrid:<block>:cell:<rowId>:<colKey>`.

---

## 6. `rating` — stars

```csv type:score=rating title="Crew rating"
id,name,score
1,Ada,5
2,Grace,4.5
3,Dennis,4
4,Linus,3.5
5,Margaret,5
```

`rating(10)` scales to a 10-star max.

---

## 7. `progress` — inline bar

```csv type:done=progress title="Project progress"
id,project,done
P1,storage adapter,100
P2,datagrid core,95
P3,column types,80
P4,polish pass,55
P5,tests,20
P6,a11y,0
```

Explicit scale: `progress(0:50)` for a 0–50 range. Color ramps:
muted → amber → primary → emerald as fill grows.

---

## 8. `currency` — locale-aware with ISO code

```csv type:spend=currency(USD) type:cloud=currency(EUR) title="Cost breakdown"
id,service,spend,cloud
s1,compute,1250.00,890.50
s2,storage,75.40,42.10
s3,network,312.00,180.00
s4,cdn,90.00,60.00
```

---

## 9. `percentage` — smart scaling

```csv type:engagement=percentage type:retention=percentage title="Metrics"
id,campaign,engagement,retention
c1,email,0.42,85
c2,push,0.18,72
c3,in-app,0.67,91
```

Values between 0–1 auto-scale ×100. Values ≥1 are treated as already-percent.

---

## 10. `filesize` — bytes → KB/MB/GB

```csv type:size=filesize title="Assets"
id,file,size
f1,logo.svg,4821
f2,hero.jpg,842100
f3,demo.mp4,15728640
f4,dataset.parquet,2147483648
```

---

## 11. `url` — clickable with hostname + open-icon

```csv type:home=url title="Links"
id,project,home
r1,filemark,https://example.com/filemark
r2,datagrid,example.com/datagrid
r3,tanstack,https://tanstack.com/table
```

Auto-adds `https://` if missing. Display shows `hostname + path` for tidiness.

---

## 12. `email` — mailto

```csv type:contact=email title="Contacts"
id,name,contact
u1,Ada,ada@example.org
u2,Grace,grace@navy.mil
```

---

## 13. `phone` — tel

```csv type:phone=phone title="Phone book"
id,name,phone
u1,Ada,+1-202-555-0101
u2,Grace,+44 20 7946 0100
```

---

## 14. `code` — monospace inline

```csv type:slug=code title="URL slugs"
id,title,slug
a1,About us,/about-us
a2,Pricing,/pricing
a3,Blog Post 42,/blog/42-the-answer
```

---

## 15. `color` — swatch + hex

```csv type:primary=color title="Theme tokens"
id,token,primary
t1,brand.primary,#0ea5e9
t2,brand.accent,#a855f7
t3,brand.muted,#71717a
t4,brand.danger,#ef4444
```

Accepts `#RRGGBB`, `#RGB`, or `#RRGGBBAA`. Invalid → shows the text as-is.

---

## 16. `date` — localized formatting

```csv type:joined=date title="Join dates"
id,name,joined
1,Ada,1815-12-10
2,Grace,1906-12-09
3,Linus,1969-12-28
```

---

## 17. `relative` — live "X ago"

```csv type:pushed=relative title="Recent commits"
id,repo,pushed
r1,filemark,2026-04-22T09:15:00Z
r2,datagrid,2026-04-23T01:10:00Z
r3,old-thing,2023-02-01T00:00:00Z
r4,future-thing,2027-01-01T00:00:00Z
```

Hover a cell to see the absolute datetime.

---

## 18. `avatar` — initials circle + name

```csv type:owner=avatar title="Owners (initials mode)"
id,project,owner
p1,datagrid,Ada Lovelace
p2,mdx,Grace Hopper
p3,csv,Dennis Ritchie
p4,theme,Margaret Hamilton
```

### Avatar with image URL (pipe-separated)

```csv type:who=avatar title="Avatar with image"
id,contributor,who
c1,maintainer,Ada Lovelace|https://avatars.githubusercontent.com/u/1?v=4
c2,reviewer,Grace Hopper|https://avatars.githubusercontent.com/u/2?v=4
```

Falls back to initials if the image fails or is omitted.

---

## 19. `id` — monospaced identifier with click-to-copy

```csv type:uuid=id type:name=string title="UUID registry"
uuid,name,kind
019db6fc-cc79-727c-84d0-387549d2af16,CLAUDE.md symlink,file
019db6fc-cc8a-71a1-863f-3910a1be461d,docs symlink,dir
019db6fe-334e-7203-86f4-3dca349d9783,docsi symlink,dir
```

Long ids are elided (`019db6fc…`); click to copy the full value.

---

## 20. Mixed — a real-world-looking roadmap

```csv type:id=id type:priority=status(P0:danger,P1:warn,P2:info,P3:muted) type:owner=avatar type:tags=tags type:progress=progress type:done=checkbox type:updated=relative title="Q2 roadmap" sort=progress:desc row-numbers
id,title,priority,owner,tags,progress,done,updated
r-1,Ship datagrid v1,P0,Ada Lovelace,"grid,csv,mdx",95,false,2026-04-23T01:00:00Z
r-2,MDX security pass,P1,Grace Hopper,"mdx,security",70,false,2026-04-22T14:00:00Z
r-3,Column types,P0,Linus Torvalds,"grid,types",88,true,2026-04-23T02:00:00Z
r-4,Theme v2,P2,Margaret Hamilton,"theme,shadcn",40,false,2026-04-20T09:00:00Z
r-5,Sidepanel,P3,Dennis Ritchie,"ui,sidepanel",15,false,2026-04-10T10:00:00Z
r-6,Link graph,P3,Barbara Liskov,"graph,md",5,false,2026-04-05T12:00:00Z
r-7,VS Code host,P2,Tim Berners-Lee,"port,vscode",25,false,2026-04-15T08:00:00Z
```

Every feature in one block:
- `id` column (click to copy)
- `status` with custom color map
- `avatar` with initials
- `tags` with hashed colors
- `progress` bar with live fill
- `checkbox` persisting per row
- `relative` time w/ absolute on hover
- `sort=progress:desc` pre-sorts on load
- `row-numbers` prepends a `#` column
- Header filters active below, global search top-right
- Drag column edges to resize, double-click to reset
- `JSON` / `MD` buttons export the current filtered / sorted view

---

## 21. External CSV — relative path (`AssetResolver`)

```csv src=./sales.csv type:revenue=currency(USD) sort=revenue:desc title="From sibling file"
```

Relative paths (`./…` / `../…`) go through the injected `AssetResolver`,
which only resolves when this `.md` is opened via **Open Folder…** (FSA
handle) or via a drag-dropped folder (in-memory file map). Single-file
drops have no siblings — the block renders an actionable error instead
of an empty grid.

### External CSV — absolute URL (direct fetch, no folder needed)

```csv src=https://cdn.wsform.com/wp-content/uploads/2020/06/industry.csv title="WS Form industry list"
```

Absolute URLs (`http://`, `https://`, `file://`, `blob:`, `data:`) are
fetched directly, bypassing `AssetResolver`. Works from any ingest
context — single-file drop, folder, intercepted file://. The only
caveats are the usual HTTP ones: the remote server must send
`Access-Control-Allow-Origin` (or be same-origin), and the URL has to
actually resolve. CORS / DNS / 4xx errors surface as a clear message in
the block, not an empty grid.

---

## 21b. `<Datagrid>` tag — component-style invocation

The `<Datagrid>` / `<datagrid>` tag is the component-style equivalent
of the fenced ` ```csv ` block. It always loads from `src=` (a relative
path or absolute URL); inline data isn't supported because HTML
attributes can't cleanly hold multi-line CSV.

### Minimal — just a URL

<Datagrid src="https://cdn.wsform.com/wp-content/uploads/2020/06/industry.csv" title="Industries"></Datagrid>

### Relative path + common options via top-level attrs

<Datagrid
  src="./sales.csv"
  title="Q2 Sales"
  sort="revenue:desc"
  row-numbers="true"
  height="260"></Datagrid>

### Complex `type:<col>=…` specs via the `meta` attribute

HTML attribute names can't carry colons cleanly, so type specs ride in
a single `meta=` attribute whose value is the same info-string grammar
used after a fenced `csv`. Simple top-level attrs still override / merge
on top.

<Datagrid
  src="./sales.csv"
  title="Typed sales"
  sort="revenue:desc"
  meta="type:region=status(North:info,South:warn,East:primary,West:success) type:revenue=currency(USD)"></Datagrid>

### Error path — missing `src`

The tag without a `src=` renders an inline warning (Rule 3 — skeleton
honesty), not an empty grid:

<Datagrid title="Oops no src"></Datagrid>

### When to use which syntax

| Use case | Prefer |
|---|---|
| Data is in this file | ` ```csv ` fenced block |
| Data in a sibling file | either — tag reads cleaner inline |
| Data on a remote URL | either — tag is visually lighter |
| You have a lot of `type:<col>=…` flags | ` ```csv ` fenced (simpler info-string) |
| You want the block to degrade to a static table in other viewers (GitHub, VS Code preview) | `<Datagrid>` will appear as nothing in those viewers; use fenced csv, which renders as a plain code block elsewhere |

---

## 22. Wide table — 12 columns, horizontal scroll stress test

```csv type:id=id type:status=status type:priority=status(P0:danger,P1:warn,P2:info,P3:muted) type:owner=avatar type:tags=tags type:spend=currency(USD) type:progress=progress type:score=rating type:size=filesize type:url=url type:done=checkbox type:updated=relative title="Wide grid" row-numbers sort=priority
id,title,status,priority,owner,tags,spend,progress,score,size,url,done,updated
019db6fc-cc79-727c-84d0-387549d2af16,Ship datagrid core,done,P0,Ada Lovelace,"grid,csv,mdx",4250.00,95,5,8421200,https://example.com/datagrid,true,2026-04-23T01:00:00Z
019db6fc-cc8a-71a1-863f-3910a1be461d,Column types v1,done,P0,Linus Torvalds,"grid,types",3100.50,90,5,4198200,example.com/types,true,2026-04-22T22:30:00Z
019db6fd-aaaa-71a1-863f-3910a1be461d,Resize + horizontal scroll,pending,P1,Grace Hopper,"grid,ux,polish",1800.00,70,4,2098400,example.com/resize,false,2026-04-22T14:10:00Z
019db6fd-bbbb-71a1-863f-3910a1be461d,MDX security pass,review,P1,Margaret Hamilton,"mdx,security",950.25,55,4,620400,example.com/mdx-sec,false,2026-04-20T09:00:00Z
019db6fd-cccc-71a1-863f-3910a1be461d,Sidepanel UI,pending,P2,Dennis Ritchie,"ui,sidepanel",420.00,30,3,210500,example.com/sidepanel,false,2026-04-15T10:00:00Z
019db6fd-dddd-71a1-863f-3910a1be461d,VS Code host,wip,P2,Tim Berners-Lee,"port,vscode",780.00,25,3,180300,example.com/vscode,false,2026-04-14T08:00:00Z
019db6fd-eeee-71a1-863f-3910a1be461d,Link graph viewer,todo,P3,Barbara Liskov,"graph,md",120.00,5,2,52100,example.com/graph,false,2026-04-05T12:00:00Z
019db6fd-ffff-71a1-863f-3910a1be461d,Sparkline + icon types,todo,P3,Donald Knuth,"grid,v2",90.00,0,2,18500,example.com/sparkline,false,2026-04-02T08:00:00Z
019db6fe-1111-71a1-863f-3910a1be461d,A11y grid roles,blocked,P1,Alan Turing,"a11y,grid",250.00,10,3,41200,example.com/a11y,false,2026-04-18T11:00:00Z
019db6fe-2222-71a1-863f-3910a1be461d,Streaming CSV worker,pending,P2,Karen Spärck Jones,"perf,worker",310.00,15,3,88300,example.com/worker,false,2026-04-16T09:30:00Z
019db6fe-3333-71a1-863f-3910a1be461d,Theme v2,pending,P2,Radia Perlman,"theme,shadcn",640.00,40,4,140200,example.com/theme,false,2026-04-11T13:00:00Z
019db6fe-4444-71a1-863f-3910a1be461d,Multi-column sort,todo,P3,Brian Kernighan,"grid,power",60.00,0,2,12100,example.com/multi-sort,false,2026-03-28T09:00:00Z
```

12 data columns + 1 row-number column. On a typical 1000px viewport:

- Columns won't fit; outer container scrolls horizontally.
- Sticky header keeps labels visible while scrolling vertically.
- Per-column filter row scrolls with the header.
- Drag any column edge to widen/narrow; double-click edge = reset.
- Sort by clicking a column header (try `priority` — custom color map + sorted desc).
- `JSON` / `MD` export buttons respect the current filtered + sorted view.
- Toggling any `done` checkbox persists per-row via its UUID.

## 23. v1.1 — Multi-column sort (shift-click a second header)

Shift-clicking a second header keeps the first sort and layers a secondary
on top. Each active sort shows its ordinal (1, 2, 3) next to the arrow.
The footer text shows "N-col sort" while multi-sort is active.

```csv type:status=status title="Sort by priority, then status" sort=priority:asc,status:asc
id,title,priority,status
T-1,Ship grid v1.1,P0,done
T-2,Wire forms,P1,wip
T-3,Graph view,P2,todo
T-4,Theme tuning,P1,done
T-5,Auto-refresh,P2,wip
T-6,Keyboard nav,P1,done
T-7,Export xlsx,P2,todo
T-8,Presentation mode,P3,todo
```

Comma-separated sort specs in the info-string seed the initial multi-sort.
Shift-click any header at runtime to add / remove secondary sorts.

---

## 24. v1.1 — Match highlight

Filter or search → matching substrings inside string cells wrap in
`<mark>`. Structured cells (status, tags, avatar, currency, etc.) ignore
highlight — their content isn't free text.

```csv title="Try typing 'apollo' or 'eng' in the search box"
name,title,note
Ada Lovelace,mathematician,Wrote the first algorithm to be run on a machine
Grace Hopper,admiral,"Compilers, english-like languages, nanoseconds on a wire"
Margaret Hamilton,engineer,Led the Apollo Guidance Computer flight software team
Linus Torvalds,engineer,"Kernel hacker, git author, sometimes grumpy"
Barbara Liskov,engineer,Abstract data types and the Liskov substitution principle
```

---

## 25. v1.1 — Density toggle

Toolbar button cycles **Compact → Comfy → Relaxed** row heights. Choice
persists per grid via `StorageAdapter`. You can also seed it in the
info-string with `density=compact`.

```csv density=compact title="Born in compact mode"
id,metric,value
m1,lines of code,142893
m2,test coverage,72
m3,open issues,38
m4,contributors,12
m5,releases,27
```

---

## 26. v1.1 — Aggregation footer

`agg:<col>=sum|avg|min|max|count|uniq` renders a sticky footer row with
computed values. The footer recomputes on every filter change — it
reflects what you see, not the raw dataset. Formatting respects the
column type (sum of a `currency` column uses currency, `filesize` sums
bytes and auto-units).

```csv type:spend=currency(USD) type:size=filesize agg:spend=sum agg:size=sum agg:team=uniq title="Q2 spend" sort=spend:desc
team,owner,spend,size
Frontend,Ada,12480.00,8421200
Backend,Grace,9850.50,12983400
Infra,Linus,18420.00,84123400
Data,Dennis,6275.25,2098400
Design,Margaret,3120.00,420800
Frontend,Karen,4980.00,3042100
```

Try filtering `team=Frontend` in the filter row — the `sum` updates live.

---

## 27. v1.1 — Row selection + bulk copy

`selection` flag enables a checkbox column on the far left. Click rows
to pick; shift-click for range; the header checkbox toggles all
(currently filtered) rows. The toolbar then shows **Copy CSV / Copy MD
/ Copy JSON** buttons that write the selected rows (in visible-column
projection) to the clipboard.

```csv selection type:id=id type:priority=status(P0:danger,P1:warn,P2:info,P3:muted) title="Pick a few and copy them"
id,title,priority,owner
019db6fc-cc79-727c-84d0-387549d2af16,Ship grid v1.1,P0,Ada
019db6fc-cc8a-71a1-863f-3910a1be461d,Wire forms,P1,Grace
019db6fd-aaaa-71a1-863f-3910a1be461d,Graph view,P2,Linus
019db6fd-bbbb-71a1-863f-3910a1be461d,Theme tuning,P1,Margaret
019db6fd-cccc-71a1-863f-3910a1be461d,Auto-refresh,P2,Dennis
019db6fd-dddd-71a1-863f-3910a1be461d,Presentation mode,P3,Tim
```

Select a few rows → click **Copy CSV** → paste anywhere (Slack, issue
tracker, spreadsheet). Row ids come from the `id` column (because
`type:<col>=id` is set); without an id column, selection still works
but keys by row index.

---

## 28. v1.1 — Keyboard navigation

Focus the grid (tab into it) and use:

| Key | Action |
|---|---|
| `↑` `↓` | move focused row |
| `←` `→` | move focused column |
| `Home` / `End` | first / last column in row |
| `⌘/Ctrl + Home / End` | first / last row |
| `PageDown` / `PageUp` | jump ±10 rows |
| `/` | focus the global search box |
| `Space` | toggle selection on focused row (when `selection` is on) |

Focused cell shows a subtle ring; focused row auto-scrolls into view.

```csv selection title="Tab into me, then use the keyboard"
id,task,status,owner
1,scaffold,done,Ada
2,parse info-string,done,Grace
3,column types,done,Linus
4,sort & filter,done,Margaret
5,resize,done,Dennis
6,keyboard nav,done,Barbara
7,selection,done,Tim
8,aggregation,done,Karen
9,match highlight,done,Donald
10,density toggle,done,Radia
11,pinned column,done,Brian
12,multi-sort,done,Alan
```

---

## 29. v1.1 — Pinned (frozen) columns

`freeze=<col1>,<col2>` pins columns to the left during horizontal
scroll. The selection column (`selection`) and row-number column
(`row-numbers`) are *always* pinned — they're UI columns. Frozen
columns get a subtle right-edge shadow and stacked `position: sticky`
offsets so they stack correctly in any order.

```csv selection row-numbers freeze=id,title type:id=id type:priority=status(P0:danger,P1:warn,P2:info,P3:muted) type:owner=avatar type:tags=tags type:spend=currency(USD) type:progress=progress type:score=rating type:size=filesize type:url=url type:done=checkbox type:updated=relative agg:spend=sum agg:progress=avg title="Wide + frozen" sort=priority
id,title,priority,owner,tags,spend,progress,score,size,url,done,updated
019db6fc-cc79-727c-84d0-387549d2af16,Ship datagrid core,P0,Ada Lovelace,"grid,csv,mdx",4250.00,95,5,8421200,https://example.com/datagrid,true,2026-04-23T01:00:00Z
019db6fc-cc8a-71a1-863f-3910a1be461d,Column types v1,P0,Linus Torvalds,"grid,types",3100.50,90,5,4198200,example.com/types,true,2026-04-22T22:30:00Z
019db6fd-aaaa-71a1-863f-3910a1be461d,Resize + horizontal scroll,P1,Grace Hopper,"grid,ux,polish",1800.00,70,4,2098400,example.com/resize,false,2026-04-22T14:10:00Z
019db6fd-bbbb-71a1-863f-3910a1be461d,MDX security pass,P1,Margaret Hamilton,"mdx,security",950.25,55,4,620400,example.com/mdx-sec,false,2026-04-20T09:00:00Z
019db6fd-cccc-71a1-863f-3910a1be461d,Sidepanel UI,P2,Dennis Ritchie,"ui,sidepanel",420.00,30,3,210500,example.com/sidepanel,false,2026-04-15T10:00:00Z
019db6fd-dddd-71a1-863f-3910a1be461d,VS Code host,P2,Tim Berners-Lee,"port,vscode",780.00,25,3,180300,example.com/vscode,false,2026-04-14T08:00:00Z
019db6fd-eeee-71a1-863f-3910a1be461d,Link graph viewer,P3,Barbara Liskov,"graph,md",120.00,5,2,52100,example.com/graph,false,2026-04-05T12:00:00Z
019db6fd-ffff-71a1-863f-3910a1be461d,Sparkline + icon types,P3,Donald Knuth,"grid,v2",90.00,0,2,18500,example.com/sparkline,false,2026-04-02T08:00:00Z
019db6fe-1111-71a1-863f-3910a1be461d,A11y grid roles,P1,Alan Turing,"a11y,grid",250.00,10,3,41200,example.com/a11y,false,2026-04-18T11:00:00Z
019db6fe-2222-71a1-863f-3910a1be461d,Streaming CSV worker,P2,Karen Spärck Jones,"perf,worker",310.00,15,3,88300,example.com/worker,false,2026-04-16T09:30:00Z
019db6fe-3333-71a1-863f-3910a1be461d,Theme v2,P2,Radia Perlman,"theme,shadcn",640.00,40,4,140200,example.com/theme,false,2026-04-11T13:00:00Z
019db6fe-4444-71a1-863f-3910a1be461d,Multi-column sort,P3,Brian Kernighan,"grid,power",60.00,0,2,12100,example.com/multi-sort,false,2026-03-28T09:00:00Z
```

Scroll horizontally — `#`, selection checkbox, `id`, and `title` stay
pinned while the rest slides.

---

## 29b. Column widths — `width:<col>=<px>`

Per-column initial widths via `width:<col>=<n>` (px). Author override
wins over auto-size. User can still drag the resize handle or
double-click to fit; their width then persists via `StorageAdapter`.

```csv width:title=320 width:owner=180 width:status=90 type:status=status(ok:success,slow:warn,down:danger) title="Fixed widths"
id,title,status,owner
1,Ship grid v1.2 features to production,ok,Ada
2,Wire forms MVP behind a feature flag,slow,Grace
3,Diagnose and patch the folder-handle refresh bug,ok,Linus
4,Investigate occasional service-worker crash,down,Margaret
5,Roll out the new theme system to all users,ok,Dennis
```

---

## 30. v1.2 — Row grouping

`group-by=<col>` collapses identical values in that column into group
headers with a chevron + count. Aggregations defined via `agg:<col>=…`
show per-group totals in the group header row.

```csv group-by=region type:region=status(North:info,South:warn,East:primary,West:success) type:revenue=currency(USD) agg:revenue=sum agg:units=sum title="Sales by region" sort=revenue:desc
region,product,units,revenue
North,Widget,120,3600
North,Gadget,80,4800
North,Accessory,35,980
South,Widget,95,2850
South,Gadget,130,7800
East,Widget,60,1800
East,Gadget,140,8400
East,Accessory,22,660
West,Widget,200,6000
West,Gadget,55,3300
```

Click a group's chevron to expand / collapse. Group state persists via
`StorageAdapter`.

---

## 31. v1.2 — Typed filter UIs

The filter row adapts to the column's type:

- **numeric columns** (`number`, `currency`, `percentage`, `progress`,
  `filesize`, `rating`) → min / max input pair.
- **date** / **relative** → date-range pickers.
- **status** → multi-select dropdown with colored chips, auto-populated
  from the distinct values in the data.
- **tags** → multi-select dropdown with hashed-color chips (one per
  distinct tag).
- **bool** / **checkmark** / **checkbox** → tri-state button cycling
  `any → yes → no`.
- **everything else** → plain substring text filter.

```csv type:status=status type:started=date type:revenue=currency(USD) type:tags=tags title="Typed filters demo"
id,title,status,started,revenue,tags
1,Ship grid v1.2,done,2026-04-20,12500,"grid,core"
2,Wire forms,wip,2026-04-18,3400,"forms,new"
3,Graph view,todo,2026-04-22,0,"graph,research"
4,Theme v2,done,2026-04-15,9800,"theme,polish"
5,Auto-refresh,wip,2026-04-19,1200,"infra"
6,Presentation mode,todo,2026-04-23,0,"reading,ux"
7,Backlinks,done,2026-04-10,4800,"graph,md"
8,A11y pass,wip,2026-04-17,2400,"a11y"
```

Try the status dropdown (shows `done / wip / todo` as chips), the
`started` date-range pickers, the `revenue` min/max inputs, or the
`tags` multi-select.

---

## 32. v1.2 — Row expansion (detail panel)

`expandable` prepends a chevron column. Clicking it reveals a vertical
key/value "record view" beneath the row with every visible column's
value — ideal for wide tables where scrolling right to see all
columns is painful.

```csv expandable type:id=id type:priority=status(P0:danger,P1:warn,P2:info,P3:muted) type:owner=avatar type:tags=tags type:spend=currency(USD) type:progress=progress title="Click a chevron to expand"
id,title,priority,owner,tags,spend,progress,notes
r-1,Ship datagrid v1.2,P0,Ada Lovelace,"grid,v1.2",4500.00,95,"Row grouping, typed filters, row expansion, URL sync all landed"
r-2,MDX security pass,P1,Grace Hopper,"mdx,security",950.00,70,"Sandbox-iframe path for real MDX JSX deferred to v0.2+"
r-3,Theme v2,P2,Margaret Hamilton,"theme,shadcn",640.00,45,"shadcn tokens wired; dark/light/sepia variants done"
r-4,Sidepanel UI,P2,Dennis Ritchie,"ui,sidepanel",420.00,30,"Reuses the main app shell but anchored"
r-5,VS Code host,P2,Tim Berners-Lee,"port,vscode",780.00,25,"Validates @filemark/mdx portability claim"
```

The detail panel uses the same `CellRenderer`, so rich types (status,
avatar, tags, currency, progress bar…) render the same as in the row.

---

## 33. v1.2 — URL-sync (shareable views)

`url-sync` mirrors the grid's state (sort, filters, hidden columns,
density, grouping, expansions, global search term) into
`location.hash#g=…`. Anyone opening the same `.md` with that hash
present will see exactly that view. Heading anchors (`#heading-slug`)
continue to work because URL-sync only touches its own `g=` fragment.

```csv url-sync type:priority=status(P0:danger,P1:warn,P2:info,P3:muted) title="Share the current view"
id,title,priority,owner
1,Ship grid v1.2,P0,Ada
2,Wire forms,P1,Grace
3,Graph view,P2,Linus
4,Theme v2,P2,Margaret
5,Auto-refresh,P2,Dennis
```

Sort, filter, or group above → notice `#g=<...>` appear in the URL
bar. Copy the URL, paste into a new tab → the grid reconstructs the
same view.

When both `url-sync` and a `StorageAdapter` are present, the URL wins
on hydration (shared views are reproducible even if you've locally
tweaked the grid).

---

## 34. v2 rich types — sparkline, icon, country, duration, range, json, code-block, image

### `sparkline`

Comma-separated numbers in a cell render as inline mini-charts. Three
variants: `sparkline(line)` (default), `sparkline(bar)`, `sparkline(area)`.

```csv type:trend=sparkline(line) type:traffic=sparkline(bar) type:engagement=sparkline(area) title="Sparklines"
service,trend,traffic,engagement
api,"1,3,2,5,4,7,6,8","10,30,20,50,40,70,60,80","0.2,0.3,0.25,0.5,0.4,0.7,0.6,0.8"
web,"5,4,6,3,5,4,6,7","20,40,30,50,45,60,55,70","0.5,0.4,0.55,0.3,0.45,0.4,0.5,0.6"
worker,"2,2,3,2,4,5,4,6","5,10,8,15,12,20,18,25","0.1,0.15,0.2,0.18,0.25,0.3,0.28,0.35"
```

### `icon`

Curated set of 15 named icons rendered as inline SVGs:
`check`, `x`, `warning`, `info`, `star`, `heart`, `lock`, `rocket`,
`bug`, `clock`, `flame`, `bolt`, `shield`, `mail`, `link`. Unknown
names fall back to raw text.

```csv type:kind=icon title="Icons"
kind,label,description
rocket,launch,new feature
bug,bugfix,resolved issue
lock,security,access control
shield,hardening,defense in depth
bolt,perf,performance win
flame,hot,trending this week
```

### `country`

ISO-2 codes (`US`, `JP`, `BR`) render as flag emoji + code. Non-ISO
inputs render as text.

```csv type:country=country title="Countries"
name,country,note
Ada,GB,Lovelace
Grace,US,Hopper
Dennis,US,Ritchie
Linus,FI,Torvalds
Margaret,US,Hamilton
Alan,GB,Turing
Barbara,US,Liskov
Yukihiro,JP,Matsumoto
```

### `duration`

Seconds → `1d 2h 3m 4s` (max two most-significant parts shown). Use
`duration(ms)` / `duration(m)` / `duration(h)` for alternate input
units.

```csv type:build=duration type:runtime=duration(ms) title="Build & run times"
pipeline,build,runtime
Lint,12,450
Unit tests,185,12400
E2E tests,1820,245000
Build bundle,95,3200
Deploy,32,1100
```

### `range`

Cell contains `start..end`. Auto-detects date vs numeric. Override
separator with `range(-)` etc.

```csv type:quarter=range type:stock=range(-) title="Ranges"
team,quarter,stock
Frontend,2026-01-01..2026-03-31,120-180
Backend,2026-01-15..2026-04-14,80-110
Design,2026-02-01..2026-04-30,0-40
```

### `json`

Inline pretty-printer. Invalid JSON shows as red monospace.

```csv type:config=json title="Config blobs"
service,config
api,"{""host"":""localhost"",""port"":8080,""tls"":true}"
web,"{""entry"":""index.html"",""hot"":true,""port"":5173}"
broken,"{not valid json}"
```

### `code-block`

Multi-line monospace. Escape newlines with `\n` in the CSV source
(Papaparse unescapes).

```csv type:snippet=code-block title="Code blocks"
name,snippet
greet,"fn greet(name: &str) {\n    println!(\"hello, {name}\");\n}"
add,"def add(a, b):\n    return a + b"
inline,let x = 42;
```

### `image`

Absolute URLs render as thumbnails (link opens original in new tab).
Relative paths fall back to monospace text until AssetResolver
threading lands (v2.1).

```csv type:avatar=image title="Avatars"
name,avatar
Ada,https://avatars.githubusercontent.com/u/1?v=4&s=80
Linus,https://avatars.githubusercontent.com/u/1024025?v=4&s=80
Grace,https://avatars.githubusercontent.com/u/2?v=4&s=80
```

### Kitchen-sink — every v2 rich type in one grid

```csv type:id=id type:region=country type:build=duration type:trend=sparkline(line) type:kind=icon type:stock=range(-) type:config=json title="Release dashboard" sort=build:asc
id,name,region,build,trend,kind,stock,config
r-1,api-v1,US,185,"3,5,4,7,6,8",rocket,80-120,"{""ok"":true}"
r-2,web-v2,GB,420,"1,2,3,4,5,6",bolt,60-90,"{""ok"":true,""ttl"":60}"
r-3,worker-v3,FI,95,"4,4,5,5,6,7",shield,30-50,"{""queues"":4}"
r-4,cdn-v1,JP,60,"7,8,9,10,11,12",flame,200-300,"{""edge"":true}"
r-5,db-v1,US,1205,"2,2,2,3,3,3",lock,10-25,"{""replicas"":3}"
```

---

## 35. Unknown flag warning

```csv bogus=yes also-bad=1 sort=id
id,note
n1,this still renders
n2,but the browser console logs warnings for "bogus" and "also-bad"
```

Rule 3 / skeleton honesty — flags that don't parse never silently disappear.
