import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout for everything under /demo — child routes (demo.index,
// demo.gallery.$exampleId, demo.play) own their own rendering. We just
// render the Outlet so the child's component takes the full viewport.
//
// Critical: NO beforeLoad redirect here — TanStack runs the parent's
// beforeLoad for every child match too, so a redirect here loops
// against /demo/gallery/<id>. The default-redirect lives in demo.index.tsx.

const SITE = "https://khanakia.com/apps/filemark";

export const Route = createFileRoute("/demo")({
  // Demo is the interactive playground — Monaco editor + heavy renderers
  // don't render cleanly under SSR and there's no SEO value for any of
  // the gallery URLs. CSR-only via Start's `ssr: false`; child routes
  // (/demo/, /demo/play, /demo/gallery/$exampleId) inherit it.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Demo — Filemark playground" },
      {
        name: "description",
        content:
          "Live Filemark playground — every renderer running in the browser. Markdown, JSON, CSV, SQL/Prisma/DBML schemas, kanban from markdown, charts, mindmaps.",
      },
      { property: "og:title", content: "Demo — Filemark playground" },
      { property: "og:url", content: `${SITE}/demo` },
    ],
    links: [{ rel: "canonical", href: `${SITE}/demo` }],
  }),
  component: DemoLayout,
});

function DemoLayout() {
  return <Outlet />;
}
