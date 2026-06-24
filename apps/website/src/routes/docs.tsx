import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { DOCS_NAV, SITE } from "../lib/docs";
import { pageScripts } from "../lib/schema";

export const Route = createFileRoute("/docs")({
  head: () => {
    const title = "Docs — Filemark";
    const desc =
      "How every Filemark feature works: file viewers, local & remote rendering, revision mode, AI review notes, reading mode and themes.";
    const url = `${SITE}/docs`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: pageScripts({
        name: title,
        description: desc,
        url,
        crumbs: [
          { name: "Filemark", url: `${SITE}/` },
          { name: "Docs", url },
        ],
      }),
    };
  },
  component: DocsLayout,
});

function DocsLayout(): React.ReactElement {
  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-4 py-10 sm:px-6">
      {/* Sidebar — sticky on desktop, scrolls inline on mobile. */}
      <aside className="hidden w-52 shrink-0 lg:block">
        <div className="sticky top-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Documentation
          </p>
          <nav className="flex flex-col gap-0.5 text-sm">
            {DOCS_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact ?? false }}
                className="rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{
                  className: "bg-muted font-medium text-foreground",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {/* Mobile section picker (sidebar is hidden < lg). */}
        <nav className="mb-6 flex flex-wrap gap-2 lg:hidden">
          {DOCS_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
              activeProps={{
                className: "border-foreground/20 bg-muted font-medium text-foreground",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Outlet />
      </main>
    </div>
  );
}
