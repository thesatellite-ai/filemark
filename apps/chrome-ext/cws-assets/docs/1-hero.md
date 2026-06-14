# Launch plan — v0.1

Filemark goes live on the Chrome Web Store this week. The site ships first, then the listing flips once the review clears.

<Callout type="tip" title="Today's outcome">

Every required CWS field locked. Screenshots + promo tile generated. Listing reviewed and ready to submit.

</Callout>

## Goals

- Submit the extension for review
- Land the marketing site at `khanakia.com/apps/filemark/`
- Have the demo render the real product, not a stub

## Where we are

- [x] Marketing site deployed
- [x] Privacy policy CWS-grade @aman =2026-06-14
- [x] Real playground at /demo @aman =2026-06-14
- [/] Screenshots + promo tile @aman !p0 ~today
- [ ] CWS dev account + OAuth refresh token @aman !p0
- [ ] Click Submit @aman !p0

<Kanban md group-by="status" title="Launch board"></Kanban>

## Drop-in code

```ts
import { MDXViewer } from "@filemark/mdx";

export function Render({ source }: { source: string }) {
  return (
    <MDXViewer
      content={source}
      file={{ id: "demo", name: "demo.md", ext: "md" }}
    />
  );
}
```

## Format coverage

| File type | Renderer | What you get |
| --- | --- | --- |
| `.md` / `.mdx` | @filemark/mdx | GFM + every interactive component |
| `.json` | @filemark/json | Collapsible tree, nine themes |
| `.csv` / `.tsv` | @filemark/csv | Sortable, filterable datagrid |
| `.sql` / `.prisma` / `.dbml` | @filemark/schema | Interactive ER diagram |
