import chartFull from "../../../../examples/chart-full.md?raw";
import datagridFull from "../../../../examples/datagrid-full.md?raw";
import datagridIntro from "../../../../examples/datagrid.md?raw";
import showcase from "../../../../examples/showcase.md?raw";
import schemaDbml from "../../../../examples/schema.dbml?raw";
import schemaPrisma from "../../../../examples/schema.prisma?raw";
import schemaSql from "../../../../examples/schema.sql?raw";

export interface Example {
  id: string;
  title: string;
  description: string;
  content: string;
  /** Optional grouping for the sidebar. */
  section?: string;
}

const FENCE = "```";

const STARTER_DOC = [
  "# Playground starter",
  "",
  "Edit this markdown on the left. Everything re-renders live on the right.",
  "Try adding rows, changing types, or pasting in your own CSV.",
  "",
  "## Interactive grid",
  "",
  `${FENCE}csv type:priority=status(P0:danger,P1:warn,P2:info,P3:muted) type:owner=avatar type:done=checkbox type:id=id title="Scratch board" row-numbers selection`,
  "id,title,priority,owner,done",
  "1,Try shift-click multi-sort,P0,Ada Lovelace,false",
  "2,Double-click a column edge to fit content,P1,Grace Hopper,false",
  "3,Toggle density in the toolbar,P2,Linus Torvalds,true",
  "4,Edit this CSV and watch the grid update,P1,Margaret Hamilton,false",
  FENCE,
  "",
  "## Every column type",
  "",
  `${FENCE}csv type:status=status type:skills=tags type:score=rating type:progress=progress type:revenue=currency(USD) type:url=url type:pushed=relative title="Kitchen sink"`,
  "name,status,skills,score,progress,revenue,url,pushed",
  'Alpha,done,"core,ship",5,100,12500,https://example.com/a,2026-04-23T01:00:00Z',
  'Beta,wip,"ui,polish",4,65,3400,https://example.com/b,2026-04-22T14:00:00Z',
  'Gamma,todo,"research",3,10,0,https://example.com/g,2026-04-15T09:00:00Z',
  FENCE,
  "",
  "Flip to the **Gallery** tab on the left to see every feature in depth.",
  "",
].join("\n");

/**
 * Wrap a standalone schema file in a minimal markdown doc so the MDX
 * pipeline's schema-viewer fence handler picks it up. Same pattern the
 * extension uses when a user drops a raw `.prisma` / `.sql` / `.dbml`
 * file — filemark renders it wrapped in a fenced code block.
 */
/**
 * Wrap a standalone schema file in a minimal markdown doc using a fence lang
 * that `@filemark/mdx`'s schema-viewer branch actually dispatches on — which
 * is `schema` / `prisma` / `dbml` (not `sql`). For `.sql` files the ` ```schema `
 * lang auto-detects the SQL dialect.
 */
function wrapSchema(kind: "sql" | "prisma" | "dbml", source: string): string {
  const fenceLang = kind === "sql" ? "schema" : kind;
  const title = {
    sql: "SQL schema → ER diagram",
    prisma: "Prisma schema → ER diagram",
    dbml: "DBML schema → ER diagram",
  }[kind];
  return [
    `# ${title}`,
    "",
    `Fence any ${FENCE}${fenceLang}${FENCE} block inside a markdown doc and`,
    "the schema-viewer pipeline parses it and renders an interactive",
    "Mermaid ER diagram — no extra setup.",
    "",
    `${FENCE}${fenceLang}`,
    source.replace(/\n+$/, ""),
    FENCE,
    "",
  ].join("\n");
}

export const EXAMPLES: Example[] = [
  {
    id: "datagrid-full",
    title: "Datagrid — full feature tour",
    description:
      "30+ sections covering every column type, info-string flag, and UX feature.",
    section: "Datagrid",
    content: datagridFull,
  },
  {
    id: "datagrid-intro",
    title: "Datagrid — quick start",
    description: "Shorter first-touch walkthrough for the fenced csv syntax.",
    section: "Datagrid",
    content: datagridIntro,
  },
  {
    id: "playground-starter",
    title: "Playground starter",
    description: "Minimal scratch doc you can edit live.",
    section: "Datagrid",
    content: STARTER_DOC,
  },
  {
    id: "chart-full",
    title: "Chart — full feature tour",
    description:
      "Bar / line / pie / area via recharts; formats, by-pivot, tags.",
    section: "Chart",
    content: chartFull,
  },
  {
    id: "showcase",
    title: "Markdown / MDX showcase",
    description:
      "The general MDX showcase — callouts, tabs, details, math, Mermaid, task lists.",
    section: "Markdown",
    content: showcase,
  },
  {
    id: "schema-sql",
    title: "SQL → ER diagram",
    description: "Drop-any-Postgres/MySQL/SQLite DDL and get an ER diagram.",
    section: "Schemas",
    content: wrapSchema("sql", schemaSql),
  },
  {
    id: "schema-prisma",
    title: "Prisma → ER diagram",
    description: "Prisma schema rendered as a live Mermaid ER diagram.",
    section: "Schemas",
    content: wrapSchema("prisma", schemaPrisma),
  },
  {
    id: "schema-dbml",
    title: "DBML → ER diagram",
    description: "The dbdiagram.io DSL, in the browser.",
    section: "Schemas",
    content: wrapSchema("dbml", schemaDbml),
  },
];

export function getExample(id: string): Example | undefined {
  return EXAMPLES.find((e) => e.id === id);
}

/** Examples grouped by section for sidebar rendering. Preserves insertion order. */
export function groupedExamples(): { section: string; items: Example[] }[] {
  const groups: { section: string; items: Example[] }[] = [];
  const map = new Map<string, Example[]>();
  for (const ex of EXAMPLES) {
    const section = ex.section ?? "Other";
    if (!map.has(section)) {
      const arr: Example[] = [];
      map.set(section, arr);
      groups.push({ section, items: arr });
    }
    map.get(section)!.push(ex);
  }
  return groups;
}
