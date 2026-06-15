import { createFileRoute } from "@tanstack/react-router";
import { PlaygroundApp } from "../playground/PlaygroundApp";
import { getExample } from "../playground/examples";

const SITE = "https://khanakia.com/apps/filemark";

export const Route = createFileRoute("/demo/gallery/$exampleId")({
  head: ({ params }) => {
    const ex = getExample(params.exampleId);
    const title = ex
      ? `${ex.title} — Filemark demo`
      : "Demo — Filemark playground";
    const desc = ex
      ? `${ex.description} Try it live, edit the source, share the URL.`
      : "Live Filemark playground — every renderer running in the browser.";
    const url = `${SITE}/demo/gallery/${params.exampleId}`;
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
    };
  },
  component: GalleryRoute,
});

function GalleryRoute() {
  const { exampleId } = Route.useParams();
  return <PlaygroundApp view="gallery" exampleId={exampleId} />;
}
