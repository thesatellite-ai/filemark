# Chart — full feature tour

Every chart type, every flag. Mirror of `datagrid-full.md` for the
`@filemark/chart` component. Drop this into Filemark (or the playground)
to see each render.

---

## 1. Bar — quick start

```chart type=bar x=region y=revenue title="Q2 revenue by region"
region,revenue
North,9380
South,10650
East,10860
West,9300
```

Fence lang sets the default type — ` ```bar ` works identically:

```bar x=product y=units title="Units shipped"
product,units
Widget,475
Gadget,405
Accessory,57
```

---

## 2. Line — multi-series, smooth

```line x=month y=users,revenue,churn smooth show-legend title="Growth over time"
month,users,revenue,churn
Jan,1200,12400,120
Feb,1380,15800,95
Mar,1520,18200,80
Apr,1680,21500,75
May,1790,24100,70
Jun,1920,26800,60
```

Multi-column `y=` renders one line per series with deterministic
palette colors + a legend.

---

## 3. Pie / donut

```pie name=team value=hours title="Q2 hours by team"
team,hours
Frontend,420
Backend,380
Infra,290
Design,180
Data,240
```

```pie name=category value=count donut show-total title="Tickets by category"
category,count
Bug,124
Feature,87
Docs,32
Chore,56
Incident,9
```

`donut` + `show-total` renders as a donut with the aggregate in the
center.

---

## 4. Area — stacked revenue composition

```area x=quarter y=subs,services,licensing stacked title="Revenue breakdown"
quarter,subs,services,licensing
Q1,120,80,40
Q2,140,85,50
Q3,165,90,55
Q4,195,100,68
```

---

## 5. Horizontal bar — top-N ranking

```bar x=country y=pop horizontal sort=pop:desc limit=8 format:pop=number title="Most populous countries (millions)"
country,pop
China,1440
India,1393
USA,331
Indonesia,273
Pakistan,220
Brazil,212
Nigeria,206
Bangladesh,164
Russia,145
Japan,125
```

---

## 6. Currency + percentage + filesize formatting

Per-column format specs drive axis ticks AND tooltips. Auto-inference
picks the right formatter based on the column type; `format:<col>=…`
overrides.

```bar x=service y=spend format:spend=currency(USD) title="Cloud spend"
service,spend
Compute,18420
Storage,4275
Network,3120
CDN,2100
Backup,960
```

```line x=week y=retention,engagement format:retention=percentage format:engagement=percentage title="Cohort metrics"
week,retention,engagement
W1,0.95,0.78
W2,0.88,0.71
W3,0.82,0.65
W4,0.76,0.58
W5,0.71,0.53
W6,0.68,0.49
```

```bar x=file y=size format:size=filesize sort=size:desc title="Asset sizes"
file,size
main.js,842100
vendor.js,1923400
app.css,84200
app.map,2100400
fonts.woff2,52400
```

---

## 7. Reference line

```line x=month y=users title="Users vs. target" reference-line=1500
month,users
Jan,1200
Feb,1380
Mar,1520
Apr,1680
May,1790
Jun,1920
```

The dashed horizontal line marks the target (`reference-line=1500`);
gets a muted color from the palette's `muted` tone.

---

## 8. By-pivot — long-form → multi-series

When your CSV is long-format (`date, category, value`), use `by=` to
pivot into multi-series automatically — no need to pre-pivot in your
editor.

```line x=month by=region y=revenue title="Revenue by region"
month,region,revenue
Jan,North,3600
Jan,South,2850
Jan,East,1800
Feb,North,4100
Feb,South,3200
Feb,East,2050
Mar,North,4500
Mar,South,3450
Mar,East,2280
Apr,North,4800
Apr,South,3700
Apr,East,2400
```

---

## 9. Accessibility fallback — `show-table`

```bar x=category y=score show-table title="With data-table fallback"
category,score
Performance,94
Accessibility,88
Best Practices,92
SEO,76
```

The full dataset renders beneath the chart as a compact datagrid —
screen-readers + no-JS get the numbers.

---

## 10. External CSV via URL

```chart type=bar src=https://cdn.wsform.com/wp-content/uploads/2020/06/industry.csv name=Industry value=Industry title="Industry list — absolute URL"
```

Or relative to the current file (works via the AssetResolver when the
doc was opened via Open Folder / folder drag-drop):

```chart type=pie src=./sales.csv name=product value=revenue donut show-total title="Sales pie (external relative)"
```

---

## 11. `<Chart>` tag — component-style invocation

Same options set, HTML-attribute surface. Prefer when your data is in
a sibling file and your info-string would get long.

<Chart
  type="line"
  src="./sales.csv"
  x="product"
  y="units,revenue"
  title="Sales — line via <Chart> tag"
  height="280"
  smooth />

<Chart
  type="bar"
  src="./sales.csv"
  x="region"
  y="revenue"
  stacked
  title="Sales — bar via tag" />

---

## 12. Scatter

```scatter x=cpu y=latency by=service title="CPU × latency"
service,cpu,latency
api,0.22,86
api,0.41,112
api,0.65,205
api,0.78,340
web,0.14,42
web,0.28,68
web,0.45,108
web,0.62,175
worker,0.08,24
worker,0.17,40
worker,0.33,72
worker,0.55,140
```

`by=<col>` groups points into multi-series; legend + palette apply
automatically.

---

## 13. Funnel — conversion drop-off

```funnel name=stage value=users title="Signup funnel"
stage,users
Landed,12400
Started signup,6800
Verified email,5100
First action,3900
Paid,820
```

---

## 14. Radar — multi-attribute comparison

```radar x=attribute y=teamA,teamB title="Feature coverage"
attribute,teamA,teamB
Performance,90,72
Accessibility,82,88
Security,75,94
DX,88,70
Docs,95,65
Tests,70,85
```

---

## 15. Axis labels

```bar x=country y=gdp x-label="Country" y-label="GDP (USD, trillions)" title="Top economies"
country,gdp
USA,27.4
China,17.8
Germany,4.5
Japan,4.2
India,3.7
UK,3.1
```

`x-label=` and `y-label=` render alongside the axes; if omitted we
infer from the column's label.

---

## 16. Annotations — vertical markers with labels

```line x=month y=users annotations=Mar:Launch,May:Pricing-change title="Growth with events"
month,users
Jan,1200
Feb,1380
Mar,1520
Apr,1780
May,1920
Jun,2380
Jul,2510
Aug,2690
```

Multiple markers: `annotations=Mar:Launch,May:Pricing-change,Jul:Bug-fix`.
Comma separates entries; colon separates the x-value from its label.

---

## 17. Colorblind-safe palette

```bar x=region y=a,b,c,d palette=colorblind title="Okabe–Ito palette"
region,a,b,c,d
N,120,95,110,85
S,130,100,95,110
E,95,120,105,95
W,150,90,120,100
```

`palette=colorblind` switches to the Okabe-Ito 2008 palette —
distinguishable under every color-vision deficiency. Register your
own with `registerPalette("brand", …)`.

---

## 18. Misconfig surfaced as a visible error card

```bar x=region y=nonexistent title="Typo demonstration"
region,revenue
North,3600
South,2850
```

The validator sees `y=nonexistent` isn't a column and renders an
inline card listing the problem + available columns. No silent empty
chart. Rule 3 — skeleton honesty.

---

## 19. Error path — missing src on the tag

<Chart title="Oops no src" type="line" />

Renders an inline warning card. Rule 3 — skeleton honesty.
