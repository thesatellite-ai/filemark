# Datagrid — fenced csv / tsv

Drop this file into Filemark. Every fenced `csv` / `tsv` block below
renders as an interactive grid: sort by clicking headers, filter per
column, or type in the top-right search box.

---

## Inline CSV — defaults on

```csv
name,age,role,joined
Ada,30,eng,2020-04-02
Grace,45,admiral,2015-11-19
Dennis,72,researcher,2001-06-02
Linus,55,maintainer,2012-03-12
Margaret,80,pioneer,1969-07-20
Barbara,90,founder,1956-05-01
```

## Disable filter row, pre-sort desc, hide a column

```csv filter=false sort=age:desc hide=notes title="Team by age"
name,age,role,notes
Ada,30,eng,hidden col
Grace,45,admiral,hidden col
Dennis,72,researcher,hidden col
Linus,55,maintainer,hidden col
Margaret,80,pioneer,hidden col
Barbara,90,founder,hidden col
```

## TSV with forced types + right-align

```tsv type:price=number align:price=right
product	price	in_stock
Book	12.50	true
Pen	1.99	true
Mug	8.00	false
Notebook	4.75	true
```

## Markdown in cells — bold, code, links, task checkboxes, strikethrough

```csv
task,status,owner,link
**Ship datagrid**,`[ ] todo`,@ada,[spec](https://example.com/spec)
*review infer-types*,`[x] done`,@grace,[PR #12](https://example.com/pr/12)
~~drop pagination~~,`[x] done`,@linus,
Add CSV export,`[ ] todo`,@margaret,[issue #42](https://example.com/42)
```

## External file (only works when opened via folder picker)

```csv src=./sales.csv sort=revenue:desc
```

If you opened this file as a single drop, the block above will render
an inline warning — that's expected. Open the parent folder instead
(`Open Folder…`) and both this file and `sales.csv` become accessible.

## Custom delimiter

```csv delimiter=;
country;capital;population
Japan;Tokyo;125800000
Brazil;Brasília;214300000
Kenya;Nairobi;53770000
```

## No header — columns synthesized as col_0, col_1, …

```csv header=false
Ada,30,eng
Grace,45,admiral
Dennis,72,researcher
```

## Unknown flag → console warning, still renders

```csv bogus=yes sort=name
a,b,c
1,2,3
4,5,6
```
