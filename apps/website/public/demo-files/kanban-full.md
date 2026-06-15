# Kanban — full feature tour

Purely visual board — groups a CSV by a column, renders each group as
a column of cards. No drag-drop (filemark is a reader — edit the CSV
in your editor, filemark re-renders on auto-refresh).

---

## 1. Quick start — the minimum possible board

```kanban group-by=status card-title=title
id,title,status,owner
1,Ship datagrid,done,Ada
2,Wire charts,wip,Grace
3,Write kanban,wip,Linus
4,Ship forms,todo,Margaret
5,Ship ADR,todo,Dennis
6,Ship timeline,backlog,Karen
```

Columns are created from distinct values in `status`. First-appearance
order in the data; override with `order=`.

---

## 2. Explicit column order + card fields

```kanban group-by=status order=todo,wip,review,done card-title=title card-fields=owner,priority title="Q2 roadmap"
id,title,status,owner,priority
r-1,Ship grid v2,wip,Ada,P0
r-2,Typed filters,done,Grace,P1
r-3,Charts,wip,Linus,P0
r-4,Theme tuning,review,Margaret,P1
r-5,Sidepanel,todo,Dennis,P2
r-6,Graph view,todo,Barbara,P2
r-7,Forms MVP,todo,Karen,P1
r-8,A11y pass,review,Alan,P1
```

`order=` pins explicit column positions; any value not listed falls to
the end in first-appearance order. `card-title=` picks the headline
column, `card-fields=` chooses the secondary rows.

---

## 3. Rich cell types in cards (status / avatar / tags / rating / date)

Since cards render fields through the datagrid's `CellRenderer`,
every type from the datagrid tour works inline on a card.

```kanban group-by=stage order=Inbox,Research,Build,Review,Done card-title=task card-fields=owner,priority,tags,due,score type:priority=status(P0:danger,P1:warn,P2:info,P3:muted) type:owner=avatar type:tags=tags type:due=date type:score=rating title="Planning board"
id,task,stage,priority,owner,tags,due,score
t-01,Outline Q3 roadmap,Inbox,P0,Ada Lovelace,"strategy,planning",2026-05-01,5
t-02,User-interview batch #3,Research,P1,Grace Hopper,"research,users",2026-04-28,4
t-03,Datagrid v2 ship prep,Build,P0,Linus Torvalds,"grid,v2",2026-04-26,5
t-04,Kanban v1 polish,Build,P1,Margaret Hamilton,"kanban,new",2026-04-27,4
t-05,Theme audit,Review,P2,Dennis Ritchie,"theme,polish",2026-04-25,3
t-06,Graph MVP spec,Inbox,P2,Barbara Liskov,"graph,research",2026-05-05,3
t-07,Charts v1 ship,Done,P0,Karen Spärck Jones,"charts,shipped",2026-04-23,5
t-08,A11y keyboard pass,Research,P1,Alan Turing,"a11y,keyboard",2026-04-30,4
```

---

## 4. Card badge — corner-positioned field

```kanban group-by=status order=todo,wip,done card-title=title card-badge=priority type:priority=status(P0:danger,P1:warn,P2:info,P3:muted) card-fields=owner
id,title,status,priority,owner
1,DB migration,wip,P0,Ada
2,Refactor mailer,done,P2,Grace
3,Upgrade deps,wip,P1,Linus
4,Doc polish,todo,P3,Margaret
5,CI cache tune,todo,P1,Dennis
```

`card-badge=` pulls a single column to the top-right corner of each
card — ideal for a priority pill, a status marker, an avatar.

---

## 5. Within-column sort

```kanban group-by=status card-title=title card-fields=owner,score type:score=rating sort=score:desc order=active,queued,shelved
id,title,status,owner,score
1,Sparkline,queued,Ada,3
2,Treemap,shelved,Grace,2
3,Funnel,active,Linus,5
4,Radar,active,Margaret,4
5,Heatmap,shelved,Dennis,4
6,Sankey,queued,Barbara,4
7,Dual y-axis,active,Alan,5
```

`sort=score:desc` orders cards within each column. Column order stays
driven by `order=`.

---

## 6. Hide empty columns + hide specific columns

```kanban group-by=state order=new,open,closed no-empty card-title=issue hide=internal_id
internal_id,issue,state,owner
i-01,Editor crashes on >10MB,open,Ada
i-02,Missing grid sort arrow,open,Grace
i-03,Sidebar focus trap,closed,Linus
```

`no-empty` skips any group with zero cards (there's no "new" issue so
that column is omitted). `hide=internal_id` drops that column from
card rendering.

---

## 7. No card-count badges in column headers

```kanban group-by=priority order=P0,P1,P2,P3 card-title=title no-count
id,title,priority,owner
1,Critical bug,P0,Ada
2,Perf regression,P1,Grace
3,Polish,P2,Linus
4,Icebox,P3,Margaret
```

`no-count` hides the little `(N)` badge in each column's header.

---

## 8. External CSV via `src=`

```kanban src=./roadmap.csv group-by=status card-title=title card-fields=owner title="From sibling file"
```

Works when the file was opened via Open Folder or a dropped folder
(either gives a persistent FSA handle). Single-file drops don't have
sibling access; you'll see an error card.

---

## 9. External CSV via absolute URL

```kanban src=https://cdn.wsform.com/wp-content/uploads/2020/06/industry.csv group-by=Industry card-title=Industry title="Industries"
```

Absolute URLs bypass `AssetResolver` and fetch directly.

---

## 10. `<Kanban>` tag — component-style invocation

<Kanban
  src="./roadmap.csv"
  group-by="status"
  order="todo,wip,review,done"
  card-title="title"
  card-fields="owner,priority"
  title="Q2 roadmap — via tag" />

Same rules as `<Datagrid>` / `<Chart>` — src-based only; inline data
belongs in a `\`\`\`kanban` fence.

---

## 11. Error path — misconfigured group-by

```kanban group-by=nonexistent card-title=title
id,title,status
1,Foo,todo
2,Bar,done
```

The validator notices `group-by=nonexistent` isn't a real column and
renders an inline card listing the available columns. No silent
empty board.

---

## 12. Missing src on the tag

<Kanban title="Oops no src" group-by="status" />

Returns a warning card. Same pattern as `<Chart>` / `<Datagrid>`.
